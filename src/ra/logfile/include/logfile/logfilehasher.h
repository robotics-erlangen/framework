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

#ifndef LOGFILEHASHER_H
#define LOGFILEHASHER_H

#include <QString>
#include "protobuf/status.h"

class SeqLogFileReader;

class LogFileHasher
{
public:
    //hash uses an 'almost const' reference:
    //although it has to call modifieing calls to reader, it restores the
    //original state by using a memento before returning
    static std::string hash(SeqLogFileReader& reader);
    static QString replace(QString logfile, QString output);
    const static qint32 HASHED_PACKAGES = 100;

    LogFileHasher();
    std::string takeResult() const;
    void add(const Status& status);
    bool isFinished() const { return m_collected == HASHED_PACKAGES; }
    void clear();

private:
    Status m_state = Status(new amun::Status);
    int m_collected = 0;
};
#endif // LOGFILEHASHER_H
