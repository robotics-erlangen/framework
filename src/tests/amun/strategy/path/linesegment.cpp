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
#include "path/linesegment.h"
#include <iostream>

TEST(LineSegment, Distance) {
    LineSegment segment(Vector(0, 0), Vector(1, 0));
    ASSERT_FLOAT_EQ(segment.distance(Vector(0, 0)), 0);
    ASSERT_FLOAT_EQ(segment.distance(Vector(1, 0)), 0);
    ASSERT_FLOAT_EQ(segment.distance(Vector(0.5, 0)), 0);
    ASSERT_FLOAT_EQ(segment.distance(Vector(0.5, 1)), 1);
    ASSERT_FLOAT_EQ(segment.distance(Vector(0.5, -1)), 1);
    ASSERT_FLOAT_EQ(segment.distance(Vector(-1, 0)), 1);
    ASSERT_FLOAT_EQ(segment.distance(Vector(2, 0)), 1);
}

TEST(LineSegment, DistanceSq) {
    LineSegment segment(Vector(0, 0), Vector(1, 0));
    ASSERT_FLOAT_EQ(segment.distanceSq(Vector(0, 0)), 0);
    ASSERT_FLOAT_EQ(segment.distanceSq(Vector(1, 0)), 0);
    ASSERT_FLOAT_EQ(segment.distanceSq(Vector(0.5, 0)), 0);
    ASSERT_FLOAT_EQ(segment.distanceSq(Vector(0.5, 1)), 1);
    ASSERT_FLOAT_EQ(segment.distanceSq(Vector(0.5, -1)), 1);
    ASSERT_FLOAT_EQ(segment.distanceSq(Vector(-1, 0)), 1);
    ASSERT_FLOAT_EQ(segment.distanceSq(Vector(2, 0)), 1);
    ASSERT_FLOAT_EQ(segment.distanceSq(Vector(3, 0)), 4);
}

TEST(LineSegment, DistanceLineSegment) {
    LineSegment segment(Vector(0, 0), Vector(1, 0));
    ASSERT_FLOAT_EQ(segment.distance(LineSegment(Vector(1, 0), Vector(1, 1))), 0);
    ASSERT_FLOAT_EQ(segment.distance(LineSegment(Vector(0, 0), Vector(-1, 0))), 0);
    ASSERT_FLOAT_EQ(segment.distance(LineSegment(Vector(0.5, 1), Vector(0.5, -1))), 0);
    ASSERT_FLOAT_EQ(segment.distance(LineSegment(Vector(0, 1), Vector(1, 1))), 1);
    ASSERT_FLOAT_EQ(segment.distance(LineSegment(Vector(0, -1), Vector(1, -1))), 1);
    ASSERT_FLOAT_EQ(segment.distance(LineSegment(Vector(-0.5, 1), Vector(-0.5, -1))), 0.5);
    ASSERT_FLOAT_EQ(segment.distance(LineSegment(Vector(1.5, 1), Vector(1.5, -1))), 0.5);
}

TEST(LineSegment, ClosestPoint) {
    LineSegment segment(Vector(0, 0), Vector(1, 0));
    ASSERT_EQ(segment.closestPoint(Vector(0, 0)), Vector(0, 0));
    ASSERT_EQ(segment.closestPoint(Vector(1, 0)), Vector(1, 0));
    ASSERT_EQ(segment.closestPoint(Vector(0.5, 0)), Vector(0.5, 0));
    ASSERT_EQ(segment.closestPoint(Vector(0.5, 1)), Vector(0.5, 0));
    ASSERT_EQ(segment.closestPoint(Vector(0.5, -1)), Vector(0.5, 0));
    ASSERT_EQ(segment.closestPoint(Vector(-1, 0)), Vector(0, 0));
    ASSERT_EQ(segment.closestPoint(Vector(-1, 0.5)), Vector(0, 0));
    ASSERT_EQ(segment.closestPoint(Vector(2, 0)), Vector(1, 0));
    ASSERT_EQ(segment.closestPoint(Vector(2, 0.5)), Vector(1, 0));
}

TEST(LineSegment, StartAndEnd) {
    LineSegment segment(Vector(0, 0), Vector(1, 0));
    ASSERT_EQ(segment.start(), Vector(0, 0));
    ASSERT_EQ(segment.end(), Vector(1, 0));

    segment = LineSegment(Vector(2, 3), Vector(5, 4));
    ASSERT_EQ(segment.start(), Vector(2, 3));
    ASSERT_EQ(segment.end(), Vector(5, 4));
}

TEST(LineSegment, DirAndNormal) {
    LineSegment segment(Vector(0, 0), Vector(1, 0));
    ASSERT_EQ(segment.dir(), Vector(1, 0));
    ASSERT_FLOAT_EQ(std::abs(segment.normal().x), 0);
    ASSERT_FLOAT_EQ(std::abs(segment.normal().y), 1);

    segment = LineSegment(Vector(0, 0), Vector(5, 0));
    ASSERT_EQ(segment.dir(), Vector(1, 0));
    ASSERT_FLOAT_EQ(std::abs(segment.normal().x), 0);
    ASSERT_FLOAT_EQ(std::abs(segment.normal().y), 1);
}
