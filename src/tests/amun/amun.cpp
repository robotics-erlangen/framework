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
#include "amun/amun.h"
#include "config/config.h"
#include "seshat/logfilereader.h"

#include <QCoreApplication>
#include <QProcess>
#include <map>

static void checkTeamEquality(google::protobuf::RepeatedPtrField<world::Robot> r1,
                              google::protobuf::RepeatedPtrField<world::Robot> r2)
{
    ASSERT_EQ(r1.size(), r2.size());
    for (int i = 0;i<r1.size();i++) {
        ASSERT_EQ(r1[i].id(), r2[i].id());
        ASSERT_EQ(r1[i].p_x(), r2[i].p_x());
        ASSERT_EQ(r1[i].p_y(), r2[i].p_y());
        ASSERT_EQ(r1[i].v_x(), r2[i].v_x());
        ASSERT_EQ(r1[i].v_y(), r2[i].v_y());
        ASSERT_EQ(r1[i].phi(), r2[i].phi());
        ASSERT_EQ(r1[i].omega(), r2[i].omega());
    }
}

static void checkWorldEquality(const world::State &original, const world::State &recreated)
{
    ASSERT_EQ(original.ball().p_x(), recreated.ball().p_x());
    ASSERT_EQ(original.ball().p_y(), recreated.ball().p_y());
    ASSERT_EQ(original.ball().p_z(), recreated.ball().p_z());
    ASSERT_EQ(original.ball().v_x(), recreated.ball().v_x());
    ASSERT_EQ(original.ball().v_y(), recreated.ball().v_y());
    ASSERT_EQ(original.ball().v_z(), recreated.ball().v_z());
    ASSERT_EQ(original.ball().touchdown_x(), recreated.ball().touchdown_x());
    ASSERT_EQ(original.ball().touchdown_y(), recreated.ball().touchdown_y());
    ASSERT_EQ(original.ball().is_bouncing(), recreated.ball().is_bouncing());

    checkTeamEquality(original.blue(), recreated.blue());
    checkTeamEquality(original.yellow(), recreated.yellow());
}

const static QString amunCliLogfile("temp_unittest_amunycli.log");
const static QString replayLogfile("temp_unittest_tracking_replay.log");

TEST(Amun, DISABLED_TrackingReplay) {
    class DeleteFile {
    public:
        ~DeleteFile() {
            QFile::remove(amunCliLogfile);
            QFile::remove(replayLogfile);
        }
    };
    DeleteFile del;

    const QString strategy = QString::fromStdString(ERFORCE_STRATEGYDIR) + "typescript/glados/init.ts";

    // TODO: because of the replaycli, this test is not deterministic

    // first stage: run the amuncli and create an up to date logfile with robot and ball action
    QString amunCliExecutable = QString("%1/amun-cli").arg(AMUNCLI_DIR);
    int exitCode = QProcess::execute(amunCliExecutable, {"-c", "both", "-s", "2020", "-t", "6", "-n", "11", "--robot-generation",
                                                        "generation_2020", "-r", amunCliLogfile, "--simulation-speed", "30", "--realism",
                                                        "Realistic", "--silent", "-f", strategy, " main"});

    ASSERT_EQ(exitCode, 0);


//    // second stage: replay the new logfile with tracking replay and save the result in another log
    std::string appName = "unittest";
    char* args[2] = {const_cast<char*>(appName.c_str()), nullptr};
    int argCount = 1;
    QCoreApplication app(argCount, args);

    Amun amun(true);
    amun.start();

    int packetCount = -1;
    amun.connect(&amun, &Amun::sendStatus, [&packetCount](const Status &s) {
        if (s->has_pure_ui_response()) {
            const auto &response = s->pure_ui_response();
            if (response.has_log_info()) {
                packetCount = response.log_info().packet_count();
            }
            if (response.has_frame_number()) {
                if (response.frame_number() == packetCount-1) {
                    QCoreApplication::exit(0);
                }
            }
        }
    });

    Command command(new amun::Command);
    command->mutable_playback()->mutable_log_path()->set_path(amunCliLogfile.toStdString());
    command->mutable_playback()->set_run_playback(true);
    command->mutable_playback()->mutable_toggle_paused();

    command->mutable_record()->set_run_logging(true);
    command->mutable_record()->set_for_replay(true);
    command->mutable_record()->set_overwrite_record_filename(replayLogfile.toStdString());

    command->mutable_tracking()->set_tracking_replay_enabled(true);

    amun.handleCommand(command);

    app.exec();


    // third stage: compare the two created logfiles and ensure that the world states are the same
    LogFileReader amunCliLog;
    ASSERT_TRUE(amunCliLog.open(amunCliLogfile));
    std::map<qint64, int> worldStateMap;
    for (int i = 0;i<amunCliLog.packetCount();i++) {
        Status status = amunCliLog.readStatus(i);
        ASSERT_FALSE(status.isNull());
        if (status->has_world_state() && status->world_state().time() != 0) {
            worldStateMap[status->world_state().time()] = i;
        }
    }

    LogFileReader replayLog;
    ASSERT_TRUE(replayLog.open(replayLogfile));
    for (int i = 0;i<replayLog.packetCount();i++) {
        Status status = replayLog.readStatus(i);
        ASSERT_FALSE(status.isNull());
        if (status->has_world_state() && status->world_state().time() != 0) {
            auto mapRes = worldStateMap.find(status->world_state().time());
            ASSERT_TRUE(mapRes != worldStateMap.end());
            Status orig = amunCliLog.readStatus(mapRes->second);
            const world::State &original = orig->world_state();
            const world::State &recreated = status->world_state();
            checkWorldEquality(original, recreated);
        }
    }
}
