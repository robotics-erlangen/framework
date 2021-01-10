/***************************************************************************
 *   Copyright 2020 Andreas Wendler                                        *
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

#include "gtest/gtest.h"
#include "seshat/logfilereader.h"
#include "seshat/logfilewriter.h"

#include <QCoreApplication>
#include <QTimer>
#include <QDebug>

const static QString filename("temp_unittest_logfilereader.log");

TEST(LogfileReader, TimestampZeroIsInvalid) {
    class DeleteFile {
    public:
        ~DeleteFile() {
            QFile::remove(filename);
        }
    };
    DeleteFile del;

    LogFileWriter writer;

    // status zero in the beginning
    ASSERT_TRUE(writer.open(filename));
    for (int i = 0;i<10;i++) {
        Status status(new amun::Status);
        status->set_time(i);
        writer.writeStatus(status);
    }
    writer.close();
    LogFileReader reader;
    ASSERT_FALSE(reader.open(filename));

    // status zero in the middle
    ASSERT_TRUE(writer.open(filename));
    for (int i = 0;i<10;i++) {
        Status status(new amun::Status);
        status->set_time(i == 5 ? 0 : i + 1);
        writer.writeStatus(status);
    }
    writer.close();
    ASSERT_FALSE(reader.open(filename));
}
