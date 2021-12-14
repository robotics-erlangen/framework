/***************************************************************************
 *   Copyright 2019 Tobias Heineken                                        *
 *   Robotics Erlangen e.V.                                                *
 *   http://www.robotics-erlangen.de/                                      *
 *   info@robotics-erlangen.de                                             *
 *                                                                         *
 *   This program is free software: you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation, either version 3 of the License, or     *
 *   any later version.                                                    *
 *                                                                         *
 *   This program is distributed in the hope that it will be useful,       *
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
 *   GNU General Public License for more details.                          *
 *                                                                         *
 *   You should have received a copy of the GNU General Public License     *
 *   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
 ***************************************************************************/
#include <iostream>
#include <string>
#include <QDir>
#include <QSettings>

#include "logfilefinder.h"
#include "logfilereader.h"

LogFileFinder::LogFileFinder()
{
}

static LogFileFinder::LogFileQuality compareEntry(const logfile::UidEntry& timeline, const logfile::UidEntry& logfile)
{
    if (timeline.hash() != logfile.hash()) {
        return LogFileFinder::LogFileQuality::NO_MATCH;
    }
    if (timeline.flags() == logfile.flags()) {
        return LogFileFinder::LogFileQuality::PERFECT_MATCH;
    }
    if ((timeline.flags() | logfile.flags()) == timeline.flags()) {
        return LogFileFinder::LogFileQuality::FULL_MATCH;
    }
    return LogFileFinder::LogFileQuality::PARTIAL_MATCH;
}

static bool isPerfectMatch(const logfile::Uid& timeline, const logfile::Uid& logfile) {
    if (timeline.parts_size() != logfile.parts_size()) {
        return false;
    }
    for (int i = 0; i < timeline.parts_size(); ++i) {
        if (compareEntry(timeline.parts(i), logfile.parts(i)) != LogFileFinder::LogFileQuality::PERFECT_MATCH) {
            return false;
        }
    }
    return true;
}

static LogFileFinder::LogFileQuality compareHash(const logfile::Uid& timeline, const logfile::Uid& logfile)
{
    //check for perfect match
    if (isPerfectMatch(timeline, logfile)) {
        return LogFileFinder::LogFileQuality::PERFECT_MATCH;
    }

    //check for fullmatch: foreach timeline search FULL / PERFECT in logfile
    bool localMatch = false;
    for (int i = 0; i < timeline.parts_size(); ++i) {
        localMatch = false;
        for (int j = 0; j < logfile.parts_size(); ++j) {
            LogFileFinder::LogFileQuality qual = compareEntry(timeline.parts(i), logfile.parts(j));
            if (qual == LogFileFinder::LogFileQuality::FULL_MATCH or qual == LogFileFinder::LogFileQuality::PERFECT_MATCH) {
                localMatch = true;
                break;
            }
        }
        if (!localMatch) {
            break;
        }
    }
    if (localMatch) {
        return LogFileFinder::LogFileQuality::FULL_MATCH;
    }

    //check for no match: foreach timeline No_Match in any logfile -> no match
    bool noMatch = false;
    for (int i = 0; i < timeline.parts_size(); ++i) {
        noMatch = true;
        for (int j = 0; j < logfile.parts_size(); ++j) {
            LogFileFinder::LogFileQuality qual = compareEntry(timeline.parts(i), logfile.parts(j));
            if (qual != LogFileFinder::LogFileQuality::NO_MATCH) {
                noMatch = false;
                break;
            }
        }
        if (!noMatch) {
            break;
        }
    }
    if (noMatch) {
        return LogFileFinder::LogFileQuality::NO_MATCH;
    }
    return LogFileFinder::LogFileQuality::PARTIAL_MATCH;
}

void LogFileFinder::addDirectory(const QString& s, logfile::LogOffer* offers)
{
    QDir dir(s);
    QFileInfoList files(dir.entryInfoList({"*.log"}, QDir::Files | QDir::Readable));
    for(const QFileInfo &info : files) {
        QString filename = info.absoluteFilePath();
        SeqLogFileReader slfr;
        auto* entry = offers->add_entries();
        entry->mutable_uri()->set_path(filename.toStdString());
        entry->set_name(info.fileName().toStdString());
        if(!slfr.open(filename)) {
            entry->set_quality(logfile::LogOfferEntry::UNREADABLE);
            std::cout << slfr.errorMsg().toStdString() << std::endl; // TODO: stdout
            continue;
        }
        Status s = slfr.readStatus();
        if (s.isNull()) {
            entry->set_quality(logfile::LogOfferEntry::UNREADABLE);
        } else if (!s->has_log_id()) {
            entry->set_quality(logfile::LogOfferEntry::UNKNOWN);// TODO: This way or Rehash and reask?
        } else {
            entry->set_quality(logfile::LogOfferEntry::PERFECT); // TODO: Offer some non-perfect matches in the future.
            const logfile::Uid& uid = s->log_id();
            if (!isPerfectMatch(m_hash, uid)) {
                offers->mutable_entries()->RemoveLast();
            }
        }
    }
}

Status LogFileFinder::find(const logfile::Uid& hash)
{
    m_hash = hash;
    return findAll();
}

Status LogFileFinder::find(logfile::Uid&& hash)
{
    m_hash = std::move(hash);
    return findAll();
}

Status LogFileFinder::find(const QString& stringified)
{
    QStringList splitted = stringified.split("+");
    bool ok = true;
    std::string error;
    for(const QString& elem : splitted) {
        auto* hashPart = m_hash.add_parts();
        QStringList parts = elem.split(":");
        if (parts.size() == 0) {
            error = "Having a QStringList post split with 0 entries seems impossible: " + elem.toStdString();
            ok = false;
            break;
        }
        hashPart->set_hash(parts[0].remove('\n').toStdString());
        if (parts.size() >= 2) {
            if (parts.size() >= 3) {
                error = "Every entry should not have more than 1 colon: " + elem.toStdString();
                ok = false;
                break;
            }
            hashPart->set_flags(parts[1].toInt(&ok));
            if (!ok) {
                hashPart->clear_flags();
                error = "This was an unparsable number: " + parts[1].toStdString() + ", in: " + elem.toStdString();
                break;
            }
        }
    }

    if (ok) {
        return findAll();
    }
    int sz = error.size();
    for (int i=50; i < sz; i += 50) {
        error.insert(i, "\n");
    }
    Status status{new amun::Status};
    status->mutable_pure_ui_response()->set_log_uid_parser_error(error);
    return status;
}

Status LogFileFinder::findAll()
{
    Status s = Status::createArena();
    logfile::LogOffer* offers = s->mutable_pure_ui_response()->mutable_log_offers();
    findLocal(offers);
    return s;
}

void LogFileFinder::findLocal(logfile::LogOffer* offers)
{
    QSettings s("ER-Force", "Ra");
    s.beginGroup("LogLocation");
    int size = s.beginReadArray("locations");
    for(int i = 0; i < size; ++i){
        s.setArrayIndex(i);
        QString path = s.value("path").toString();
        addDirectory(path, offers);
    }
    s.endArray();
    s.endGroup();
}

