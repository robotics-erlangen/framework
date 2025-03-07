/****************************************************************************
 *   Copyright 2025 Paul Bergmann                                           *
 *   Robotics Erlangen e.V.                                                 *
 *   http://www.robotics-erlangen.de/                                       *
 *   info@robotics-erlangen.de                                              *
 *                                                                          *
 *   This program is free software: you can redistribute it and/or modify   *
 *   it under the terms of the GNU General Public License as published by   *
 *   the Free Software Foundation, either version 3 of the License, or      *
 *   any later version.                                                     *
 *                                                                          *
 *   This program is distributed in the hope that it will be useful,        *
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of         *
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the          *
 *   GNU General Public License for more details.                           *
 *                                                                          *
 *   You should have received a copy of the GNU General Public License      *
 *   along with this program.  If not, see <http://www.gnu.org/licenses/>.  *
 ***************************************************************************/

#include "core/timeconversion.h"

#include "gtest/gtest.h"
#include <chrono>

using namespace std::chrono;
using namespace std::chrono_literals;

TEST(CoreTime, FromVisionTime) {
    EXPECT_EQ(fromVisionTime(0.0), 0ns);
    EXPECT_EQ(fromVisionTime(1.0), 1s);
    EXPECT_EQ(fromVisionTime(0.5), 500ms);
    EXPECT_EQ(fromVisionTime(0.1), 100ms);
    EXPECT_EQ(fromVisionTime(0.01), 10ms);
    EXPECT_EQ(fromVisionTime(0.001), 1ms);
    EXPECT_EQ(fromVisionTime(0.0001), 100us);
    EXPECT_EQ(fromVisionTime(0.00001), 10us);
    EXPECT_EQ(fromVisionTime(0.000001), 1us);
    EXPECT_EQ(fromVisionTime(0.0000001), 100ns);
    EXPECT_EQ(fromVisionTime(0.00000001), 10ns);
    EXPECT_EQ(fromVisionTime(0.000000001), 1ns);
    EXPECT_EQ(fromVisionTime(0.0000000001), 0ns);
    EXPECT_EQ(fromVisionTime(1.23456789), 1234567890ns);
}

TEST(CoreTime, ToVisionTime) {
    EXPECT_EQ(toVisionTime(0ns), 0.0);
    EXPECT_EQ(toVisionTime(1s), 1.0);
    EXPECT_EQ(toVisionTime(500ms), 0.5);
    EXPECT_EQ(toVisionTime(100ms), 0.1);
    EXPECT_EQ(toVisionTime(10ms), 0.01);
    EXPECT_EQ(toVisionTime(1ms), 0.001);
    EXPECT_EQ(toVisionTime(100us), 0.0001);
    EXPECT_EQ(toVisionTime(10us), 0.00001);
    EXPECT_EQ(toVisionTime(1us), 0.000001);
    EXPECT_EQ(toVisionTime(100ns), 0.0000001);
    EXPECT_EQ(toVisionTime(10ns), 0.00000001);
    EXPECT_EQ(toVisionTime(1ns), 0.000000001);
    EXPECT_EQ(toVisionTime(0ns), 0.0);
    EXPECT_EQ(toVisionTime(1234567890ns), 1.23456789);
}
