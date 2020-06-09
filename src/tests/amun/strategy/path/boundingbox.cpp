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
#include "path/boundingbox.h"
#include <iostream>

TEST(BoundingBox, IsInside) {
    BoundingBox box(Vector(0, 0), Vector(1, 1));

    // test that all 4 corners are inside
    const float EPS = 0.001f;
    ASSERT_TRUE(box.isInside(Vector(EPS, EPS)));
    ASSERT_TRUE(box.isInside(Vector(1 - EPS, EPS)));
    ASSERT_TRUE(box.isInside(Vector(EPS, 1 - EPS)));
    ASSERT_TRUE(box.isInside(Vector(1 - EPS, 1 - EPS)));

    // corner
    ASSERT_TRUE(box.isInside(Vector(0.5f, 0.5f)));

    // directly outside, at the corners
    ASSERT_FALSE(box.isInside(Vector(-EPS, -EPS)));
    ASSERT_FALSE(box.isInside(Vector(1 + EPS, EPS)));
    ASSERT_FALSE(box.isInside(Vector(EPS, 1 + EPS)));
    ASSERT_FALSE(box.isInside(Vector(1 + EPS, 1 + EPS)));

    // some far away points
    ASSERT_FALSE(box.isInside(Vector(1000000, 0)));
    ASSERT_FALSE(box.isInside(Vector(-500, 2342345)));
}

static void checkIntersectsPointlike(BoundingBox box, Vector point, bool expected) {
    BoundingBox box2(point, point);
    ASSERT_TRUE(box.intersects(box2) == expected);
    ASSERT_TRUE(box2.intersects(box) == expected);
}

TEST(BoundingBox, Intersects) {
    BoundingBox base(Vector(0, 0), Vector(1, 1));

    // some tests with point-like bounding boxes (copied from isInside)
    {
        // test that all 4 corners are inside
        const float EPS = 0.001f;
        checkIntersectsPointlike(base, Vector(EPS, EPS), true);
        checkIntersectsPointlike(base, Vector(1 - EPS, EPS), true);
        checkIntersectsPointlike(base, Vector(EPS, 1 - EPS), true);
        checkIntersectsPointlike(base, Vector(1 - EPS, 1 - EPS), true);

        // corner
        checkIntersectsPointlike(base, Vector(0.5f, 0.5f), true);

        // directly outside, at the corners
        checkIntersectsPointlike(base, Vector(-EPS, -EPS), false);
        checkIntersectsPointlike(base, Vector(1 + EPS, EPS), false);
        checkIntersectsPointlike(base, Vector(EPS, 1 + EPS), false);
        checkIntersectsPointlike(base, Vector(1 + EPS, 1 + EPS), false);

        // some far away points
        checkIntersectsPointlike(base, Vector(1000000, 0), false);
        checkIntersectsPointlike(base, Vector(-500, 2342345), false);
    }

    BoundingBox zeroCentered(Vector(-0.5, -0.5), Vector(0.5, 0.5));
    ASSERT_TRUE(base.intersects(zeroCentered));
    ASSERT_TRUE(zeroCentered.intersects(base));

    BoundingBox atTwo(Vector(2, 0), Vector(3, 1));
    ASSERT_FALSE(base.intersects(atTwo));
    ASSERT_FALSE(atTwo.intersects(base));

    BoundingBox around(Vector(-2, -2), Vector(3, 3));
    ASSERT_TRUE(base.intersects(around));
    ASSERT_TRUE(around.intersects(base));

    BoundingBox partiallyInsideX(Vector(-2, 0.6), Vector(3, 0.7));
    ASSERT_TRUE(base.intersects(partiallyInsideX));
    ASSERT_TRUE(partiallyInsideX.intersects(base));

    BoundingBox partiallyInsideY(Vector(0.6, -2), Vector(0.7, 3));
    ASSERT_TRUE(base.intersects(partiallyInsideY));
    ASSERT_TRUE(partiallyInsideY.intersects(base));

    BoundingBox aroundX(Vector(-2, 1.1f), Vector(3, 3));
    ASSERT_FALSE(base.intersects(aroundX));
    ASSERT_FALSE(aroundX.intersects(base));
}

TEST(BoundingBox, MergePoint) {
    BoundingBox base(Vector(0, 0), Vector(1, 1));
    base.mergePoint(Vector(2, 2));
    ASSERT_EQ(base.bottom, 0);
    ASSERT_EQ(base.left, 0);
    ASSERT_EQ(base.top, 2);
    ASSERT_EQ(base.right, 2);

    base.mergePoint(Vector(-42, 1));
    ASSERT_EQ(base.bottom, 0);
    ASSERT_EQ(base.left, -42);
    ASSERT_EQ(base.top, 2);
    ASSERT_EQ(base.right, 2);
}

TEST(BoundingBox, AddExtraRadius) {
    BoundingBox base(Vector(0, 0), Vector(0, 0));
    base.addExtraRadius(1);
    ASSERT_EQ(base.bottom, -1);
    ASSERT_EQ(base.left, -1);
    ASSERT_EQ(base.top, 1);
    ASSERT_EQ(base.right, 1);

    base = BoundingBox(Vector(1, 1), Vector(3, 2));
    base.addExtraRadius(1);
    ASSERT_EQ(base.bottom, 0);
    ASSERT_EQ(base.left, 0);
    ASSERT_EQ(base.top, 3);
    ASSERT_EQ(base.right, 4);
}
