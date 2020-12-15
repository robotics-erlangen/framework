/***************************************************************************
 *   Copyright 2018 Tobias Heineken                                        *
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

#ifndef LOGFILEFINDER_H
#define LOGFILEFINDER_H

#include <QString>
#include <memory>
#include "protobuf/logfile.pb.h"
#include "protobuf/status.h"

class LogFileReader;

class LogFileFinder
{
public:
    enum class LogFileQuality
    {
        PERFECT_MATCH, FULL_MATCH, PARTIAL_MATCH, UNKNOWN, NO_MATCH, NOT_READABLE
    };

    explicit LogFileFinder();
    Status find(const logfile::Uid& m_hash);
    Status find(logfile::Uid&& m_hash);
    Status find(const QString& stringified);
private:
    void findLocal(logfile::LogOffer* offers);
    Status findAll();
    void addDirectory(const QString& s, logfile::LogOffer* offers);
    logfile::Uid m_hash;
};

#endif
