/***************************************************************************
 *   Copyright 2025 Paul Bergmann                                          *
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

#include "core/areaofinterest.h"
#include "core/vector.h"
#include "gtest/gtest.h"

TEST(AreaOfInterest, Constructor) {
    AreaOfInterest normal { -1.0f, -0.5f, 1.0f, 1.0f };
    ASSERT_EQ(normal.x1(), -1.0f);
    ASSERT_EQ(normal.y1(), -0.5f);
    ASSERT_EQ(normal.x2(), 1.0f);
    ASSERT_EQ(normal.y2(), 1.0f);

    AreaOfInterest flipped { 1.0f, 1.0f, -1.0f, -0.5f };
    ASSERT_EQ(flipped.x1(), -1.0f);
    ASSERT_EQ(flipped.y1(), -0.5f);
    ASSERT_EQ(flipped.x2(), 1.0f);
    ASSERT_EQ(flipped.y2(), 1.0f);
}

TEST(AreaOfInterest, ContainsVisionUniformTransform) {
    AreaOfInterest a { -1.0f, -0.5f, 1.0f, 1.0f };

    ASSERT_TRUE(a.containsVision({ 0.0f, 0.0f }, {}));

    // Boundaries were excluded at the time of writing.
    // Probably not too important, but should be documented.
    ASSERT_FALSE(a.containsVision({ -1000, -500 }, {}));
    ASSERT_FALSE(a.containsVision({ 1000, 1000 }, {}));

    ASSERT_FALSE(a.containsVision({ -1100, -500 }, {}));
    ASSERT_FALSE(a.containsVision({ 1100, 1000 }, {}));
}
