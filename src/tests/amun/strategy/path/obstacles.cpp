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
using namespace MovingObstacles;

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

        float distanceError = std::abs(std::max(0.0f, segmentDistance) - std::max(0.0f, minDistance));
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

TEST(Obstacles, Triangle_BoundingBox) {
    Triangle t(nullptr, 0, 0, Vector(0, 0), Vector(1, 0), Vector(0, 1));
    auto b = t.boundingBox();
    ASSERT_FLOAT_EQ(b.left, 0);
    ASSERT_FLOAT_EQ(b.right, 1);
    ASSERT_FLOAT_EQ(b.top, 1);
    ASSERT_FLOAT_EQ(b.bottom, 0);

    t = Triangle(nullptr, 0, 1, Vector(0, 0), Vector(1, 0), Vector(0, 1));
    b = t.boundingBox();
    ASSERT_FLOAT_EQ(b.left, -1);
    ASSERT_FLOAT_EQ(b.right, 2);
    ASSERT_FLOAT_EQ(b.top, 2);
    ASSERT_FLOAT_EQ(b.bottom, -1);
}

TEST(Obstacles, Line_Distance) {
    Line l(nullptr, 0, 0.5, Vector(0, 0), Vector(1, 0));
    ASSERT_FLOAT_EQ(l.distance(Vector(0, 0)), -0.5);
    ASSERT_FLOAT_EQ(l.distance(Vector(1, 0)), -0.5);
    ASSERT_FLOAT_EQ(l.distance(Vector(-0.5, 0)), 0);
    ASSERT_FLOAT_EQ(l.distance(Vector(0.5, 0.5)), 0);
    ASSERT_FLOAT_EQ(l.distance(Vector(3, 0)), 1.5);
}

TEST(Obstacles, Line_DerivativeDistances) {
    testDerivativeDistanceRandomized([](std::function<float()> random) {
        float radius = random() < 0 ? 0 : 0.4f;
        return std::make_unique<Line>(nullptr, 0, radius, Vector(random(), random()),
                                          Vector(random(), random()));
    });
}

TEST(Obstacles, Line_BoundingBox) {
    Line l(nullptr, 0, 0.5, Vector(0, 0), Vector(1, 1));
    auto b = l.boundingBox();
    ASSERT_FLOAT_EQ(b.left, -0.5);
    ASSERT_FLOAT_EQ(b.right, 1.5);
    ASSERT_FLOAT_EQ(b.top, 1.5);
    ASSERT_FLOAT_EQ(b.bottom, -0.5);
}

TEST(Obstacles, MovingCircle_Intersects) {
    MovingCircle c(0, 1, Vector(1, 1), Vector(1, 0), Vector(0, 0), 0, 100);
    ASSERT_TRUE(c.intersects(Vector(1, 1), 0));
    ASSERT_TRUE(c.intersects(Vector(0.01, 1), 0));
    ASSERT_FALSE(c.intersects(Vector(1, 1), 1.1));
    ASSERT_TRUE(c.intersects(Vector(11, 1), 10));

    // start time
    c = MovingCircle(0, 1, Vector(0, 0), Vector(0, 1), Vector(0, 0), 5, 100);
    ASSERT_FALSE(c.intersects(Vector(0, 0), 4.99));
    ASSERT_TRUE(c.intersects(Vector(0, 0), 5));

    // end time
    c = MovingCircle(0, 1, Vector(0, 0), Vector(1, 0), Vector(0, 0), 0, 1);
    ASSERT_TRUE(c.intersects(Vector(1, 0), 1));
    ASSERT_FALSE(c.intersects(Vector(1, 0), 1.1));

    // acc
    c = MovingCircle(0, 1, Vector(0, 0), Vector(1, 0), Vector(0, 1), 0, 100);
    ASSERT_FALSE(c.intersects(Vector(10, 0), 10));
    ASSERT_TRUE(c.intersects(Vector(10, 50), 10));
}

TEST(Obstacles, MovingCircle_Distance) {
    MovingCircle c(0, 1, Vector(0, 0), Vector(1, 0), Vector(0, 1), 0, 10);
    ASSERT_FLOAT_EQ(c.distance(Vector(0, 0), 0), -1);
    ASSERT_FLOAT_EQ(c.distance(Vector(1, 0), 0), 0);
    ASSERT_FLOAT_EQ(c.distance(Vector(10, 0), 0), 9);
    ASSERT_FLOAT_EQ(c.distance(Vector(0, 0.5), 1), 0);
    ASSERT_FLOAT_EQ(c.distance(Vector(10, 50), 10), -1);

    c = MovingCircle(0, 1, Vector(0, 0), Vector(0, 0), Vector(0, 0), 1, 2);
    ASSERT_FLOAT_EQ(c.distance(Vector(0, 0), 0), std::numeric_limits<float>::max());
    ASSERT_FLOAT_EQ(c.distance(Vector(0, 0), 2.001), std::numeric_limits<float>::max());
}

static void testDerivativeDistanceRandomizedMoving(std::function<std::unique_ptr<MovingObstacle>(std::function<float()>)> generator) {
    const float BOX_SIZE = 20.0f;

    std::mt19937 r(0);
    auto makeFloat = [&]() {
        return r() / float(r.max()) * BOX_SIZE - BOX_SIZE * 0.5f;
    };

    for (int i = 0;i<1000;i++) {
        auto o = generator(makeFloat);

        for (int j = 0;j<100;j++) {
            Vector pos = Vector(makeFloat(), makeFloat());
            float time = std::abs(makeFloat()) / 5;

            float dist = o->distance(pos, time);

            if (dist <= 0) {
                ASSERT_TRUE(o->intersects(pos, time));
            } else {
                ASSERT_FALSE(o->intersects(pos, time));
            }

            auto d1 = o->zonedDistance(pos, time, 0);
            ASSERT_EQ(d1, dist <= 0 ? ZonedIntersection::IN_OBSTACLE : ZonedIntersection::FAR_AWAY);

            if (dist > 0) {
                if (dist == std::numeric_limits<float>::max()) {
                    ASSERT_EQ(o->zonedDistance(pos, time, 1), ZonedIntersection::FAR_AWAY);
                    ASSERT_EQ(o->zonedDistance(pos, time, 100000), ZonedIntersection::FAR_AWAY);
                } else {
                    auto d2 = o->zonedDistance(pos, time, dist / 2);
                    ASSERT_EQ(d2, ZonedIntersection::FAR_AWAY);

                    auto d3 = o->zonedDistance(pos, time, dist * 0.99f);
                    ASSERT_EQ(d3, ZonedIntersection::FAR_AWAY);

                    auto d4 = o->zonedDistance(pos, time, dist * 1.01f);
                    ASSERT_EQ(d4, ZonedIntersection::NEAR_OBSTACLE);
                }
            } else {
                auto d5 = o->zonedDistance(pos, time, 1);
                ASSERT_EQ(d5, ZonedIntersection::IN_OBSTACLE);
            }
        }
    }
}

TEST(Obstacles, MovingCircle_DerivativeDistance) {
    testDerivativeDistanceRandomizedMoving([](std::function<float()> random) {
        float radius = random() < 0 ? 0.1 : 5;
        float t0 = std::abs(random()) / 10;
        float t1 = t0 + std::abs(random()) / 5;
        return std::make_unique<MovingCircle>(0, radius, Vector(random(), random()), Vector(random(), random()) / 10,
                                              Vector(random(), random()) / 50, t0, t1);
    });
}

TEST(Obstacles, MovingCircle_BoundingBox) {
    MovingCircle c(0, 1, Vector(1, 1), Vector(0, 0), Vector(0, 0), 0, 1);
    auto b = c.boundingBox();

    ASSERT_FLOAT_EQ(b.left, 0);
    ASSERT_FLOAT_EQ(b.right, 2);
    ASSERT_FLOAT_EQ(b.top, 2);
    ASSERT_FLOAT_EQ(b.bottom, 0);

    c = MovingCircle(0, 1, Vector(0, 0), Vector(1, 1), Vector(0, 0), 3, 5);
    b = c.boundingBox();

    ASSERT_FLOAT_EQ(b.left, -1);
    ASSERT_FLOAT_EQ(b.right, 3);
    ASSERT_FLOAT_EQ(b.top, 3);
    ASSERT_FLOAT_EQ(b.bottom, -1);

    c = MovingCircle(0, 1, Vector(0, 0), Vector(1, 1), Vector(1, 1), 3, 5);
    b = c.boundingBox();

    ASSERT_FLOAT_EQ(b.left, -1);
    ASSERT_FLOAT_EQ(b.right, 5);
    ASSERT_FLOAT_EQ(b.top, 5);
    ASSERT_FLOAT_EQ(b.bottom, -1);

    c = MovingCircle(0, 1, Vector(0, 0), Vector(1, 1), Vector(0, -1), 0, 5);
    b = c.boundingBox();

    ASSERT_FLOAT_EQ(b.left, -1);
    ASSERT_FLOAT_EQ(b.right, 6);
    ASSERT_FLOAT_EQ(b.top, 1.5);
    ASSERT_FLOAT_EQ(b.bottom, -8.5);
}

TEST(Obstacles, MovingCircle_boundingBox_Randomized) {
    const float BOX_SIZE = 20.0f;
    std::mt19937 r(0);
    auto makeFloat = [&]() {
        return r() / float(r.max()) * BOX_SIZE - BOX_SIZE * 0.5f;
    };

    for (int i = 0;i<1000;i++) {
        float radius = makeFloat() < 0 ? 0.1 : 5;
        float t0 = std::abs(makeFloat()) / 10;
        float t1 = t0 + std::abs(makeFloat()) / 3;
        Vector p0 = Vector(makeFloat(), makeFloat());
        Vector v0 = Vector(makeFloat(), makeFloat()) / 5;
        Vector acc = Vector(makeFloat(), makeFloat()) / 5;
        MovingCircle m(0, radius, p0, v0, acc, t0, t1);

        BoundingBox b = m.boundingBox();

        BoundingBox ref(p0, p0);

        const int ITERATIONS = 1000;
        Vector last = p0;
        float maxDiff = 0;
        for (int i = 0;i<ITERATIONS;i++) {
            float t = (t1 - t0) * float(i) / (ITERATIONS - 1);
            Vector pos = p0 + v0 * t + acc * (0.5f * t * t);
            ref.mergePoint(pos);
            maxDiff = std::max(maxDiff, pos.distance(last));
            last = pos;
        }
        ref.addExtraRadius(radius);

        float maxError = 2 * maxDiff;
        ASSERT_LE(std::abs(b.top - ref.top), maxError);
        ASSERT_LE(std::abs(b.bottom - ref.bottom), maxError);
        ASSERT_LE(std::abs(b.left - ref.left), maxError);
        ASSERT_LE(std::abs(b.right - ref.right), maxError);

    }
}
