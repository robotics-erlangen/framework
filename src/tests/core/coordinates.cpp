/***************************************************************************
 *   Copyright 2021 Tobias Heineken                                        *
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
#include "core/coordinates.h"
#include "core/vector.h"
#include "protobuf/ssl_simulation_control.pb.h"
#include "protobuf/status.h"

TEST(Coordinates, Pairs) {
    std::pair<float, float> res;
    std::pair<int, int> cur{-1, -5};
    coordinates::fromVision(cur, res);
    std::pair<float, float> end;
    coordinates::toVision(res, end);
    ASSERT_FLOAT_EQ(end.first, -1);
    ASSERT_FLOAT_EQ(end.second, -5);
}

TEST(Coordinates, PairsToVec) {
    Vector res;
    std::pair<int, int> cur{-1, -5};
    coordinates::fromVision(cur, res);
    Vector end;
    coordinates::toVision(res, end);
    ASSERT_FLOAT_EQ(end.x, -1);
    ASSERT_FLOAT_EQ(end.y, -5);
}

TEST(Coordinates, ProtoToVecAndBack) {
    Vector res;
    SSL_DetectionBall ball;
    ball.set_x(-1);
    ball.set_y(5);
    SSL_DetectionBall end;
    coordinates::fromVision(ball, res);
    coordinates::toVision(res, end);
    ASSERT_FLOAT_EQ(end.x(), -1);
    ASSERT_FLOAT_EQ(end.y(), 5);
}


TEST(Coordinates, ToProtobuf) {
    Vector res;

    sslsim::TeleportBall ball;

    std::pair<int, int> cur{-1, -5};
    coordinates::fromVision(cur, ball);
    coordinates::toVision(ball, res);

    ASSERT_FLOAT_EQ(res.x, -1);
    ASSERT_FLOAT_EQ(res.y, -5);
}
