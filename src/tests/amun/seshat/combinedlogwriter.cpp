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
#include "seshat/combinedlogwriter.h"

#include <QCoreApplication>
#include <QTimer>
#include <QDebug>

const static QString filename("temp_unittest_combinedlogwriter.log");

TEST(CombinedLogWriter, WriteAndReadAgainEquality) {
    const int PACKETS = 30;

    class DeleteFile {
    public:
        ~DeleteFile() {
            QFile::remove(filename);
        }
    };
    DeleteFile del;

    qRegisterMetaType<Command>("Command");
    qRegisterMetaType<Status>("Status");

    std::string appName = "unittest";
    char* args[2] = {const_cast<char*>(appName.c_str()), nullptr};
    int argCount = 1;

    {
        QCoreApplication app(argCount, args);

        QTimer::singleShot(0, [&](){
            CombinedLogWriter writer(false, 1);

            Command command(new amun::Command);
            command->mutable_record()->set_run_logging(true);
            command->mutable_record()->set_for_replay(false);
            command->mutable_record()->set_overwrite_record_filename(filename.toStdString());

            writer.handleCommand(command);

            for (int i = 0;i<PACKETS;i++) {
                Status status(new amun::Status);
                status->set_time(i + 1);
                status->mutable_world_state()->set_time(i);
                status->mutable_world_state()->set_system_delay(i);
                writer.handleStatus(status);
            }

            app.connect(&writer, &CombinedLogWriter::destroyed, &app, &QCoreApplication::quit, Qt::QueuedConnection);
        });

        app.exec();
    }

    {
        QCoreApplication app(argCount, args);

        LogFileReader reader;
        ASSERT_TRUE(reader.open(filename));
        ASSERT_GE(reader.packetCount(), PACKETS);
        int lastTime = 1;
        for (int i = 0;i<reader.packetCount();i++) {
            Status status = reader.readStatus(i);
            ASSERT_FALSE(status.isNull());
            ASSERT_NE(status->time(), 0);

            ASSERT_TRUE(status->time() == lastTime + 1 || lastTime == 1);
            if (lastTime > 1) {
                ASSERT_TRUE(status->has_world_state());
                ASSERT_EQ(status->world_state().time(), status->time() - 1);
                ASSERT_EQ(status->world_state().system_delay(), status->time() - 1);
            }
            lastTime = status->time();
        }
    }
}
