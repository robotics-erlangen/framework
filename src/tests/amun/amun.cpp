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
