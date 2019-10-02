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

#ifndef SEQLOGFILEREADER_H
#define SEQLOGFILEREADER_H

#include "protobuf/status.h"
#include <QObject>
#include <QString>
#include <QDataStream>
#include <QFile>
#include <QList>

class QMutex;

// This class reads logfiles _sequentially_.
// Calling either of readStatus and readTimestamp will result in moving the pointer to the next entry.
// To aquire both, timestamp and status, call readStatus and extract the timestamp from the returned Status object.
// Calling readTimestamp does not need to decompress the data, so it is the faster operation, as long as no Status from this group is needed.
class SeqLogFileReader
{
public:
    class Memento
    {
    private:
        explicit Memento(qint64 base, int index): baseOffset(base), groupIndex(index) {}
        qint64 baseOffset;
        int groupIndex;
        friend class SeqLogFileReader;
    };
    SeqLogFileReader();
    ~SeqLogFileReader();
    SeqLogFileReader(const SeqLogFileReader&) = delete;
    SeqLogFileReader& operator=(const SeqLogFileReader&) = delete;
    SeqLogFileReader(SeqLogFileReader&&);

    bool open(const QString &filename);
    bool isOpen() const { return m_file->isOpen(); }

    QString fileName() const { return m_file->fileName(); }
    QString errorMsg() const { return m_errorMsg; }

    Status readStatus();
    qint64 readTimestamp();
    bool atEnd() const { return m_stream->atEnd() && (m_version != Version2 || m_currentGroupIndex >= m_currentGroupMaxIndex); }
    // returns how much data has been read from the disc at the moment. pecent() should only be used to visiualize some kind of progress.
    // Do not use percent in any way to check if the reader finished working. Use atEnd() instead.
    double percent() const {return 1.0 * m_file->pos() / m_file->size();}
    void close();
    void reset() { applyMemento(Memento{m_startOffset, 0}); }

    Memento createMemento() const { return m_version == Version2 ? Memento(m_baseOffset, m_currentGroupIndex): Memento(m_file->pos(), 0); }
    void applyMemento(const Memento& m);
    static QList<Memento> createMementos(const QList<qint64>& offsets, qint32 groupedPackages);

    qint32 groupSize() const { return m_packageGroupSize; }

private:
    bool readVersion();
    qint64 readTimestampVersion0();
    qint64 readTimestampVersion1();
    qint64 readTimestampVersion2();
    bool readNextGroup();
    bool readCurrentGroup();
    // calling readStatus with false will NOT load the next group if necessary.
    // It is the callers responsibility to make sure seqlogfilereader is not left without loading the next group, either for
    // reading timestamps or for reading status
    Status readStatus(bool loadNextGroup);

    mutable QMutex *m_mutex;
    QString m_errorMsg;

    std::unique_ptr<QFile> m_file;
    std::unique_ptr<QDataStream> m_stream;

    enum Version { Version0, Version1, Version2 };
    Version m_version;
    // a group of Status packages and an array of offsets
    QByteArray m_currentGroup;
    QList<qint32> m_currentGroupOffsets;
    // The index of the package inside its group that will be returned on the next call of either readTimestamp or readStatus
    int m_currentGroupIndex;
    // The index of the first package inside its group that is no longer part of that group
    int m_currentGroupMaxIndex;
    // how many packets are one group
    qint32 m_packageGroupSize;
    qint64 m_baseOffset;
    bool m_readingTimstamps;
    // m_baseOffset for the first group
    qint64 m_startOffset;
};

#endif // SEQLOGFILEREADER_H
