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
#include "core/vector.h"

TEST(Vector, Constructor) {
    Vector v(1, 0);
    ASSERT_EQ(v.x, 1);
    ASSERT_EQ(v.y, 0);

    // copy
    Vector v2 = v;
    ASSERT_EQ(v2.x, 1);
    ASSERT_EQ(v2.y, 0);
}

TEST(Vector, IndexOperator) {
    Vector v(1, 0);
    ASSERT_EQ(v[0], 1);
    ASSERT_EQ(v[1], 0);

    // assignment
    v[0] = 2;
    ASSERT_EQ(v.x, 2);
}

TEST(Vector, Operators) {
    Vector v1(1, 2);
    Vector v2(2, 1);

    Vector sum = v1 + v2;
    ASSERT_EQ(sum.x, 3);
    ASSERT_EQ(sum.y, 3);

    Vector diff = v1 - v2;
    ASSERT_EQ(diff.x, -1);
    ASSERT_EQ(diff.y, 1);

    Vector factored = v1 * 3;
    ASSERT_EQ(factored.x, 3);
    ASSERT_EQ(factored.y, 6);

    Vector divided = factored / 3;
    ASSERT_EQ(divided.x, 1);
    ASSERT_EQ(divided.y, 2);

    Vector vec1mod1(1, 2);
    Vector vec1mod2(2, 2);
    Vector vec1mod3(1, 1);
    Vector vec1mod4(2, 3);
    Vector vec1mod5(2, 1);
    ASSERT_EQ(v1, vec1mod1);
    ASSERT_EQ(v1, divided);
    ASSERT_NE(v1, vec1mod2);
    ASSERT_NE(v1, vec1mod3);
    ASSERT_NE(v1, vec1mod4);
    ASSERT_NE(v1, vec1mod5);

    Vector plusEq(1, 2);
    plusEq += v2;
    ASSERT_EQ(plusEq.x, 3);
    ASSERT_EQ(plusEq.y, 3);

    Vector mulEq(1, 2);
    mulEq *= 3;
    ASSERT_EQ(mulEq.x, 3);
    ASSERT_EQ(mulEq.y, 6);
}

TEST(Vector, DotProduct) {
    {
        Vector v1(0, 1);
        Vector v2(1, 0);
        ASSERT_EQ(v1 * v2, 0);
        ASSERT_EQ(v2 * v1, 0);

        ASSERT_EQ(v1.dot(v2), 0);
        ASSERT_EQ(v2.dot(v1), 0);
    }

    {
        Vector v1(1, 2);
        Vector v2(3, 4);
        ASSERT_EQ(v1 * v2, 11);
        ASSERT_EQ(v2 * v1, 11);

        ASSERT_EQ(v1.dot(v2), 11);
        ASSERT_EQ(v2.dot(v1), 11);
    }
}

TEST(Vector, Perpendicular) {
    Vector vec(1, 2);
    Vector perp1 = vec.perpendicular();
    ASSERT_EQ(perp1.x, 2);
    ASSERT_EQ(perp1.y, -1);
    ASSERT_EQ(vec.x, 1);
    ASSERT_EQ(vec.y, 2);
    Vector perp2 = perp1.perpendicular();
    ASSERT_EQ(perp2.x, -1);
    ASSERT_EQ(perp2.y, -2);
}

TEST(Vector, Normalized) {
    Vector vec(2, 0);
    Vector res = vec.normalized();
    ASSERT_EQ(vec.x, 2); // check non-modifying
    ASSERT_EQ(vec.y, 0);
    ASSERT_EQ(res.x, 1);
    ASSERT_EQ(res.y, 0);

    Vector vec2(0.5f, 0.5f);
    vec2 = vec2.normalized();
    ASSERT_FLOAT_EQ(vec2.length(), 1);

    Vector nullVec(0, 0);
    nullVec = nullVec.normalized();
    ASSERT_EQ(nullVec.x, 0);
    ASSERT_EQ(nullVec.y, 0);
}

TEST(Vector, Length) {
    Vector vecLen(3, -4);
    Vector vecLen2(-3, -4);
    Vector vecLen3(0, 0);
    ASSERT_EQ(vecLen.length(), 5);
    ASSERT_EQ(vecLen2.length(), 5);
    ASSERT_EQ(vecLen3.length(), 0);
    ASSERT_EQ(vecLen.lengthSquared(), 25);
    ASSERT_EQ(vecLen2.lengthSquared(), 25);
    ASSERT_EQ(vecLen3.lengthSquared(), 0);
    ASSERT_EQ(vecLen.length(), vecLen.length());
    ASSERT_EQ(vecLen2.length(), vecLen2.length());
    ASSERT_EQ(vecLen3.length(), vecLen3.length());
}

TEST(Vector, Distance) {
    Vector vec1(1, 2);
    Vector vec2(2, 2);
    ASSERT_EQ(vec1.distance(vec2), 1);
    ASSERT_EQ(vec2.distance(vec1), 1);

    Vector vec3(5, 5);
    ASSERT_EQ(vec1.distance(vec3), 5);
    ASSERT_EQ(vec3.distance(vec1), 5);

    Vector p1(0, 0);
    Vector p2(0.5, 0);
    ASSERT_EQ(0.25, p1.distanceSq(p2));
}
