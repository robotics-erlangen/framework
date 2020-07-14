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
#include "path/obstacles.h"
#include <iostream>
#include <functional>
#include <random>

using namespace StaticObstacles;

TEST(Obstacles, Circle_Distance) {
    Circle c(nullptr, 0, 1, Vector(0, 0));
    ASSERT_FLOAT_EQ(c.distance(Vector(0, 0)), -1);
    ASSERT_FLOAT_EQ(c.distance(Vector(1, 0)), 0);
    ASSERT_FLOAT_EQ(c.distance(Vector(-1, 0)), 0);
    ASSERT_FLOAT_EQ(c.distance(Vector(0, 1)), 0);
    ASSERT_FLOAT_EQ(c.distance(Vector(0, -1)), 0);

    Circle c2(nullptr, 0, 0.1f, Vector(1, 1));
    ASSERT_FLOAT_EQ(c2.distance(Vector(1, 1)), -0.1f);
    ASSERT_FLOAT_EQ(c2.distance(Vector(3, 1)), 1.9f);
    ASSERT_FLOAT_EQ(c2.distance(Vector(0, 1)), 0.9f);
}

TEST(Obstacles, Circle_DistanceLineSegment) {
    Circle c(nullptr, 0, 1, Vector(0, 0));
    ASSERT_FLOAT_EQ(c.distance(LineSegment(Vector(0, 0), Vector(5, 5))), -1);
    ASSERT_FLOAT_EQ(c.distance(LineSegment(Vector(1, 0), Vector(5, 5))), 0);
    ASSERT_FLOAT_EQ(c.distance(LineSegment(Vector(-3, 2), Vector(3, 2))), 1);
    ASSERT_FLOAT_EQ(c.distance(LineSegment(Vector(-3, 4), Vector(3, 4))), 3);
    ASSERT_FLOAT_EQ(c.distance(LineSegment(Vector(5, 5), Vector(0, 0))), -1);
    ASSERT_FLOAT_EQ(c.distance(LineSegment(Vector(-5, -5), Vector(0, -1))), 0);
    ASSERT_FLOAT_EQ(c.distance(LineSegment(Vector(3, 0), Vector(6, 0))), 2);
    ASSERT_FLOAT_EQ(c.distance(LineSegment(Vector(-3, 0), Vector(-6, 0))), 2);
}

TEST(Obstacles, Circle_ZonedDistance) {
    Circle c(nullptr, 0, 1, Vector(1, 1));
    ASSERT_EQ(c.zonedDistance(Vector(1, 1), 0.5), ZonedIntersection::IN_OBSTACLE);
    ASSERT_EQ(c.zonedDistance(Vector(1, 1.99), 0.5), ZonedIntersection::IN_OBSTACLE);
    ASSERT_EQ(c.zonedDistance(Vector(1, 2.01), 0.5), ZonedIntersection::NEAR_OBSTACLE);
    ASSERT_EQ(c.zonedDistance(Vector(1, 2.49), 0.5), ZonedIntersection::NEAR_OBSTACLE);
    ASSERT_EQ(c.zonedDistance(Vector(1, 2.51), 0.5), ZonedIntersection::FAR_AWAY);
}

TEST(Obstacles, Circle_ProjectOut) {
    Circle c(nullptr, 0, 1, Vector(0, 0));
    ASSERT_FLOAT_EQ(c.projectOut(Vector(0.5, 0), 0.5).distance(Vector(1.5, 0)), 0);
    ASSERT_FLOAT_EQ(c.projectOut(Vector(-0.5, 0), 0.5).distance(Vector(-1.5, 0)), 0);
    ASSERT_FLOAT_EQ(c.projectOut(Vector(0, 0.5), 0.5).distance(Vector(0, 1.5)), 0);
    ASSERT_FLOAT_EQ(c.projectOut(Vector(0, -0.5), 0.5).distance(Vector(0, -1.5)), 0);
}

TEST(Obstacles, Circle_BoundingBox) {
    Circle c(nullptr, 0, 1, Vector(0, 0));
    auto b1 = c.boundingBox();
    ASSERT_EQ(b1.left, -1);
    ASSERT_EQ(b1.right, 1);
    ASSERT_EQ(b1.top, 1);
    ASSERT_EQ(b1.bottom, -1);

    Circle c2(nullptr, 0, 0.5f, Vector(1, 1));
    auto b2 = c2.boundingBox();
    ASSERT_EQ(b2.left, 0.5);
    ASSERT_EQ(b2.right, 1.5);
    ASSERT_EQ(b2.top, 1.5);
    ASSERT_EQ(b2.bottom, 0.5);
}

TEST(Obstacles, Rect_Distance) {
    Rect r(nullptr, 0, 1, 1, 3, 2);
    // boundary
    ASSERT_FLOAT_EQ(r.distance(Vector(1, 1)), 0);
    ASSERT_FLOAT_EQ(r.distance(Vector(2, 1)), 0);
    ASSERT_FLOAT_EQ(r.distance(Vector(3, 1)), 0);
    ASSERT_FLOAT_EQ(r.distance(Vector(3, 2)), 0);
    ASSERT_FLOAT_EQ(r.distance(Vector(1, 1.5)), 0);
    ASSERT_FLOAT_EQ(r.distance(Vector(1, 2)), 0);

    // outside
    ASSERT_FLOAT_EQ(r.distance(Vector(0, 1)), 1);
    ASSERT_FLOAT_EQ(r.distance(Vector(1, 0)), 1);
    ASSERT_FLOAT_EQ(r.distance(Vector(6, 1)), 3);
    ASSERT_FLOAT_EQ(r.distance(Vector(2, 6)), 4);

    float sqrt2 = std::sqrt(2.0f);
    ASSERT_FLOAT_EQ(r.distance(Vector(0, 0)), sqrt2);
    ASSERT_FLOAT_EQ(r.distance(Vector(-1, -1)), 2 * sqrt2);
    ASSERT_FLOAT_EQ(r.distance(Vector(4, 0)), sqrt2);
    ASSERT_FLOAT_EQ(r.distance(Vector(4, 3)), sqrt2);
    ASSERT_FLOAT_EQ(r.distance(Vector(0, 3)), sqrt2);

    // inside
    r = Rect(nullptr, 0, 0, 0, 2, 2);
    ASSERT_FLOAT_EQ(r.distance(Vector(1, 1)), -1);
    ASSERT_FLOAT_EQ(r.distance(Vector(0.5, 1)), -0.5);
}

// tests distance functions that can be computed with the use of the point distance
static void testDerivativeDistanceRandomized(std::function<std::unique_ptr<Obstacle>(std::function<float()>)> generator) {
    const float BOX_SIZE = 20.0f;

    std::mt19937 r(0);
    auto makeFloat = [&]() {
        return r() / float(r.max()) * BOX_SIZE - BOX_SIZE * 0.5f;
    };

    // basic point distance test
    for (int i = 0;i<10000;i++) {
        auto o = generator(makeFloat);
        Vector pos(Vector(makeFloat(), makeFloat()));

        float dist = o->distance(pos);

        float minDist = std::numeric_limits<float>::max();
        for (Vector p : o->corners()) {
            minDist = std::min(minDist, p.distance(pos));
        }

        ASSERT_LE(dist, minDist - o->radius + 0.001f);
    }

    // test line segment distance
    for (int i = 0;i<500;i++) {
        auto o = generator(makeFloat);
        LineSegment s(Vector(makeFloat(), makeFloat()), Vector(makeFloat(), makeFloat()));

        float segmentDistance = o->distance(s);

        const int SEGMENTS = 5000;
        float minDistance = std::numeric_limits<float>::max();
        for (int j = 0;j<SEGMENTS;j++) {
            float offset = j / float(SEGMENTS - 1);
            Vector pos = s.start() + (s.end() - s.start()) * offset;
            float dist = o->distance(pos);
            minDistance = std::min(minDistance, dist);
        }

        float distanceError = std::abs(segmentDistance - std::max(0.0f, minDistance));
        float maxError = BOX_SIZE * std::sqrt(2.0f) / SEGMENTS;

        ASSERT_LE(distanceError, maxError);
    }

    // test zoned distance
    for (int i = 0;i<1000;i++) {
        auto o = generator(makeFloat);

        for (int j = 0;j<100;j++) {
            Vector pos = Vector(makeFloat(), makeFloat());
            float dist = o->distance(pos);

            auto d1 = o->zonedDistance(pos, 0);
            ASSERT_EQ(d1, dist <= 0 ? ZonedIntersection::IN_OBSTACLE : ZonedIntersection::FAR_AWAY);

            if (dist > 0) {
                auto d2 = o->zonedDistance(pos, dist / 2);
                ASSERT_EQ(d2, ZonedIntersection::FAR_AWAY);

                auto d3 = o->zonedDistance(pos, dist * 0.999f);
                ASSERT_EQ(d3, ZonedIntersection::FAR_AWAY);

                auto d4 = o->zonedDistance(pos, dist * 1.001f);
                ASSERT_EQ(d4, ZonedIntersection::NEAR_OBSTACLE);
            } else {
                auto d5 = o->zonedDistance(pos, 1);
                ASSERT_EQ(d5, ZonedIntersection::IN_OBSTACLE);
            }
        }
    }
}

TEST(Obstacles, Rect_DerivativeDistances) {
    testDerivativeDistanceRandomized([](std::function<float()> random) {
        return std::make_unique<Rect>(nullptr, 0, random(), random(), random(), random());
    });
}

TEST(Obstacles, Rect_BoundingBox) {
    Rect r(nullptr, 0, 1, 1, 3, 2);
    auto b = r.boundingBox();
    ASSERT_EQ(b.left, 1);
    ASSERT_EQ(b.right, 3);
    ASSERT_EQ(b.top, 2);
    ASSERT_EQ(b.bottom, 1);
}

TEST(Obstacles, Triangle_distance) {
    Triangle t(nullptr, 0, 0, Vector(0, 0), Vector(0, 1), Vector(1, 0));
    ASSERT_FLOAT_EQ(t.distance(Vector(0, 0)), 0);
    ASSERT_FLOAT_EQ(t.distance(Vector(1, 0)), 0);
    ASSERT_FLOAT_EQ(t.distance(Vector(0, 1)), 0);
    ASSERT_FLOAT_EQ(t.distance(Vector(0.5, 0)), 0);
    ASSERT_FLOAT_EQ(t.distance(Vector(0, 0.5)), 0);
    ASSERT_FLOAT_EQ(t.distance(Vector(0.5, 0.5)), 0);

    ASSERT_FLOAT_EQ(t.distance(Vector(0, -0.5)), 0.5);
    ASSERT_FLOAT_EQ(t.distance(Vector(-0.5, 0)), 0.5);
    ASSERT_FLOAT_EQ(t.distance(Vector(1, 1)), 0.5 * std::sqrt(2.0f));
    ASSERT_FLOAT_EQ(t.distance(Vector(-1, -1)), std::sqrt(2.0f));
    ASSERT_FLOAT_EQ(t.distance(Vector(2, 0)), 1);
    ASSERT_FLOAT_EQ(t.distance(Vector(1, -1)), 1);

    ASSERT_FLOAT_EQ(t.distance(Vector(0.1, 0.1)), -0.1);
    ASSERT_FLOAT_EQ(t.distance(Vector(0.5, 0.1)), -0.1);
    ASSERT_FLOAT_EQ(t.distance(Vector(0.1, 0.5)), -0.1);
    ASSERT_FLOAT_EQ(t.distance(Vector(0.4, 0.4)), -std::sqrt(2.0f) * 0.1);

    // with radius
    t = Triangle(nullptr, 0, 0.5, Vector(0, 0), Vector(2, 0), Vector(1, 2));
    ASSERT_FLOAT_EQ(t.distance(Vector(-0.5, 0)), 0);
    ASSERT_FLOAT_EQ(t.distance(Vector(0, 0)), -0.5);
    ASSERT_FLOAT_EQ(t.distance(Vector(3, 0)), 0.5);

    t = Triangle(nullptr, 0, 0, Vector(0, 0), Vector(5, 0), Vector(-5, -0.1));
    ASSERT_LE(std::abs(t.distance(Vector(-2.5, 0.001f)) - 0.05f), 0.001f);
}

TEST(Obstacles, Triangle_DerivativeDistances) {
    testDerivativeDistanceRandomized([](std::function<float()> random) {
        float radius = rand() < 0 ? 0 : 0.4f;
        return std::make_unique<Triangle>(nullptr, 0, radius, Vector(random(), random()),
                                          Vector(random(), random()), Vector(random(), random()));
    });
}
