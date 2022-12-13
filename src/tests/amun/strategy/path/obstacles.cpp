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

using namespace Obstacles;

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
    ASSERT_LE(c.zonedDistance(Vector(1, 1), 0.5), 0);
    ASSERT_LE(c.zonedDistance(Vector(1, 1.99), 0.5), 0);
    ASSERT_LE(c.zonedDistance(Vector(1, 2.01), 0.5), 0.5);
    ASSERT_LE(c.zonedDistance(Vector(1, 2.49), 0.5), 0.5);
    ASSERT_GE(c.zonedDistance(Vector(1, 2.51), 0.5), 0.5);
}

TEST(Obstacles, Circle_ProjectOut) {
    const Circle c{nullptr, 0, 1, Vector(0, 0)};
    ASSERT_FLOAT_EQ(c.projectOut(Vector(0.5, 0), 0.5).distance(Vector(1.5, 0)), 0);
    ASSERT_FLOAT_EQ(c.projectOut(Vector(-0.5, 0), 0.5).distance(Vector(-1.5, 0)), 0);
    ASSERT_FLOAT_EQ(c.projectOut(Vector(0, 0.5), 0.5).distance(Vector(0, 1.5)), 0);
    ASSERT_FLOAT_EQ(c.projectOut(Vector(0, -0.5), 0.5).distance(Vector(0, -1.5)), 0);
    // position exactly at the center of the circle, can be projected in any direction (also checks for NaN)
    ASSERT_FLOAT_EQ(c.projectOut(Vector(0, 0), 0).length(), 1);
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

TEST(Obstacles, Circle_Equals) {
    Circle c(nullptr, 1, 1, Vector(1, 2));
    ASSERT_EQ(c, c);

    Obstacle &a = c;
    ASSERT_EQ(a, a);

    Circle c2 = c;
    c2.prio = 99;
    ASSERT_NE(c, c2);

    c2 = c; c2.radius = 99;
    ASSERT_NE(c, c2);

    Circle c3(nullptr, 1, 1, Vector(5, 5));
    ASSERT_NE(c, c3);
}

TEST(Obstacles, Rect_Distance) {
    Rect r(nullptr, 0, 1, 1, 3, 2, 0);
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
    r = Rect(nullptr, 0, 0, 0, 2, 2, 0);
    ASSERT_FLOAT_EQ(r.distance(Vector(1, 1)), -1);
    ASSERT_FLOAT_EQ(r.distance(Vector(0.5, 1)), -0.5);

    // with radius
    r = Rect(nullptr, 0, 0, 0, 2, 2, 1);
    ASSERT_FLOAT_EQ(r.distance(Vector(0, 0)), -1);
    ASSERT_FLOAT_EQ(r.distance(Vector(1, 3)), 0);
}

TEST(Obstacles, Rect_ProjectOut) {
    Rect r(nullptr, 0, 1, 1, 4, 3, 0);
    ASSERT_FLOAT_EQ(r.projectOut(Vector(1.5, 2), 0.5).distance(Vector(0.5, 2)), 0);
    ASSERT_FLOAT_EQ(r.projectOut(Vector(2, 2.5), 0.5).distance(Vector(2, 3.5)), 0);
    ASSERT_FLOAT_EQ(r.projectOut(Vector(3.75, 2), 0.5).distance(Vector(4.5, 2)), 0);
    ASSERT_FLOAT_EQ(r.projectOut(Vector(3, 1.5), 0.5).distance(Vector(3, 0.5)), 0);
    Vector centerProjection = r.projectOut(Vector(2.5, 2), 0.5); // the exact center gets projected somewhere out of the obstacle
    ASSERT_FLOAT_EQ(r.distance(centerProjection), 0.5f);

    // with radius
    r = Rect(nullptr, 0, 1, 1, 4, 3, 0.5);
    ASSERT_FLOAT_EQ(r.projectOut(Vector(1.5, 2), 0.5).distance(Vector(0, 2)), 0);
    ASSERT_FLOAT_EQ(r.projectOut(Vector(0.8, 2), 0.5).distance(Vector(0, 2)), 0);
    ASSERT_FLOAT_EQ(r.projectOut(Vector(2, 2.5), 0.5).distance(Vector(2, 4)), 0);
    ASSERT_FLOAT_EQ(r.projectOut(Vector(3.75, 2), 0.5).distance(Vector(5, 2)), 0);
    ASSERT_FLOAT_EQ(r.projectOut(Vector(3, 1.5), 0.5).distance(Vector(3, 0)), 0);
    // corners
    ASSERT_LE(r.projectOut(Vector(0.9, 3.1), 0.5).distance(Vector(1, 3) + Vector(-1, 1).normalized()), 0.0001f);
    ASSERT_LE(r.projectOut(Vector(4.1, 3.1), 0.5).distance(Vector(4, 3) + Vector(1, 1).normalized()), 0.0001f);
    ASSERT_LE(r.projectOut(Vector(4.1, 0.9), 0.5).distance(Vector(4, 1) + Vector(1, -1).normalized()), 0.0001f);
    ASSERT_LE(r.projectOut(Vector(0.9, 0.9), 0.5).distance(Vector(1, 1) + Vector(-1, -1).normalized()), 0.0001f);
}

// tests distance functions that can be computed with the use of the point distance
static void testDerivativeDistanceRandomized(std::function<std::unique_ptr<StaticObstacle>(std::function<float()>)> generator) {
    const float BOX_SIZE = 20.0f;

    std::mt19937 r(0);
    auto makeFloat = [&]() {
        return r() / float(r.max()) * BOX_SIZE - BOX_SIZE * 0.5f;
    };

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

            const float d1 = o->zonedDistance(pos, 0);
            if (dist < 0) {
                ASSERT_FLOAT_EQ(dist, d1);
            } else {
                ASSERT_GE(d1, 0);
            }

            if (dist > 0) {
                auto d2 = o->zonedDistance(pos, dist / 2);
                ASSERT_GE(d2, dist / 2);

                auto d3 = o->zonedDistance(pos, dist * 0.999f);
                ASSERT_GE(d3, dist * 0.999f);

                auto d4 = o->zonedDistance(pos, dist * 1.001f);
                ASSERT_FLOAT_EQ(d4, dist);
            } else {
                auto d5 = o->zonedDistance(pos, 1);
                ASSERT_FLOAT_EQ(d5, dist);
            }
        }
    }
}

TEST(Obstacles, Rect_DerivativeDistances) {
    testDerivativeDistanceRandomized([](std::function<float()> random) {
        float radius = rand() < 0 ? 0 : 0.4f;
        return std::make_unique<Rect>(nullptr, 0, random(), random(), random(), random(), radius);
    });
}

TEST(Obstacles, Rect_BoundingBox) {
    Rect r(nullptr, 0, 1, 1, 3, 2, 0.5);
    auto b = r.boundingBox();
    ASSERT_EQ(b.left, 0.5);
    ASSERT_EQ(b.right, 3.5);
    ASSERT_EQ(b.top, 2.5);
    ASSERT_EQ(b.bottom, 0.5);
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

TEST(Obstacles, Line_projectOut) {
    const Line l{nullptr, 0, 0.5f, Vector(0, 0), Vector(3, 0)};
    // middle part
    ASSERT_FLOAT_EQ(l.projectOut(Vector(1, 0.1), 0.5).distance(Vector(1, 1)), 0);
    ASSERT_FLOAT_EQ(l.projectOut(Vector(1, -0.1), 0.5).distance(Vector(1, -1)), 0);
    // around first point
    ASSERT_FLOAT_EQ(l.projectOut(Vector(-0.1, 0), 0.5).distance(Vector(-1, 0)), 0);
    ASSERT_FLOAT_EQ(l.projectOut(Vector(0, 0.1), 0.5).distance(Vector(0, 1)), 0);
    ASSERT_FLOAT_EQ(l.projectOut(Vector(0, -0.1), 0.5).distance(Vector(0, -1)), 0);
    ASSERT_FLOAT_EQ(l.projectOut(Vector(0.1, 0), 0.5).x, 0.1f);
    ASSERT_FLOAT_EQ(std::abs(l.projectOut(Vector(0.1, 0), 0.5).y), 1.0f);
    ASSERT_LE(l.projectOut(Vector(0, 0), 0.5).x, 0);
}

TEST(Obstacles, MovingCircle_Intersects) {
    MovingCircle c(0, 1, Vector(1, 1), Vector(1, 0), Vector(0, 0), 0, 100);
    ASSERT_TRUE(c.intersects({{Vector(1, 1), Vector(0, 0)}, 0}));
    ASSERT_TRUE(c.intersects({{Vector(0.01, 1), Vector(0, 0)}, 0}));
    ASSERT_FALSE(c.intersects({{Vector(1, 1), Vector(0, 0)}, 1.1}));
    ASSERT_TRUE(c.intersects({{Vector(11, 1), Vector(0, 0)}, 10}));

    // start time
    c = MovingCircle(0, 1, Vector(0, 0), Vector(0, 1), Vector(0, 0), 5, 100);
    ASSERT_FALSE(c.intersects({{Vector(0, 0), Vector(0, 0)}, 4.99}));
    ASSERT_TRUE(c.intersects({{Vector(0, 0), Vector(0, 0)}, 5}));

    // end time
    c = MovingCircle(0, 1, Vector(0, 0), Vector(1, 0), Vector(0, 0), 0, 1);
    ASSERT_TRUE(c.intersects({{Vector(1, 0), Vector(0, 0)}, 1}));
    ASSERT_FALSE(c.intersects({{Vector(1, 0), Vector(0, 0)}, 1.1}));

    // acc
    c = MovingCircle(0, 1, Vector(0, 0), Vector(1, 0), Vector(0, 1), 0, 100);
    ASSERT_FALSE(c.intersects({{Vector(10, 0), Vector(0, 0)}, 10}));
    ASSERT_TRUE(c.intersects({{Vector(10, 50), Vector(0, 0)}, 10}));
}

TEST(Obstacles, MovingCircle_Distance) {
    MovingCircle c(0, 1, Vector(0, 0), Vector(1, 0), Vector(0, 1), 0, 10);
    ASSERT_FLOAT_EQ(c.distance({{Vector(0, 0), Vector(0, 0)}, 0}), -1);
    ASSERT_FLOAT_EQ(c.distance({{Vector(1, 0), Vector(0, 0)}, 0}), 0);
    ASSERT_FLOAT_EQ(c.distance({{Vector(10, 0), Vector(0, 0)}, 0}), 9);
    ASSERT_FLOAT_EQ(c.distance({{Vector(0, 0.5), Vector(0, 0)}, 1}), 0);
    ASSERT_FLOAT_EQ(c.distance({{Vector(10, 50), Vector(0, 0)}, 10}), -1);

    c = MovingCircle(0, 1, Vector(0, 0), Vector(0, 0), Vector(0, 0), 1, 2);
    ASSERT_FLOAT_EQ(c.distance({{Vector(0, 0), Vector(0, 0)}, 0}), std::numeric_limits<float>::max());
    ASSERT_FLOAT_EQ(c.distance({{Vector(0, 0), Vector(0, 0)}, 2.001}), std::numeric_limits<float>::max());
}

static void testDerivativeDistanceRandomizedMoving(std::function<std::unique_ptr<Obstacle>(std::function<float()>)> generator) {
    const float BOX_SIZE = 20.0f;

    std::mt19937 r(0);
    auto makeFloat = [&]() {
        return r() / float(r.max()) * BOX_SIZE - BOX_SIZE * 0.5f;
    };

    for (int i = 0;i<1000;i++) {
        auto o = generator(makeFloat);

        for (int j = 0;j<100;j++) {
            const Vector pos = Vector(makeFloat(), makeFloat());
            const float time = std::abs(makeFloat()) / 5;

            float dist = o->distance({{pos, Vector(0, 0)}, time});

            if (dist <= 0) {
                ASSERT_TRUE(o->intersects({{pos, Vector(0, 0)}, time}));
            } else {
                ASSERT_FALSE(o->intersects({{pos, Vector(0, 0)}, time}));
            }

            const float safety = std::abs(makeFloat() / 5);
            const float d1 = o->zonedDistance({{pos, Vector(0, 0)}, time}, safety);
            if (dist < safety) {
                ASSERT_FLOAT_EQ(dist, d1);
            } else {
                ASSERT_GE(d1 , safety);
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

TEST(Obstacles, MovingCircle_BoundingBox_Randomized) {
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

TEST(Obstacles, MovingLine_Distance) {
    const float BOX_SIZE = 20.0f;
    std::mt19937 r(0);
    auto makeFloat = [&]() {
        return r() / float(r.max()) * BOX_SIZE - BOX_SIZE * 0.5f;
    };

    for (int i = 0;i<10000;i++) {
        Vector p1 = Vector(makeFloat(), makeFloat());
        Vector p2 = Vector(makeFloat(), makeFloat());
        Vector v1 = Vector(makeFloat(), makeFloat()) / 5;
        Vector v2 = Vector(makeFloat(), makeFloat()) / 5;
        Vector acc1 = Vector(makeFloat(), makeFloat()) / 5;
        Vector acc2 = Vector(makeFloat(), makeFloat()) / 5;
        float t0 = 1;
        float t1 = 5;

        MovingLine l(0, 1, p1, v1, acc1, p2, v2, acc2, t0, t1);
        Vector pos = Vector(makeFloat(), makeFloat());

        ASSERT_EQ(l.distance({{pos, Vector(0, 0)}, t0 - 0.01f}), std::numeric_limits<float>::max());
        ASSERT_EQ(l.distance({{pos, Vector(0, 0)}, t1 + 0.01f}), std::numeric_limits<float>::max());

        float extraTime = r() / float(r.max()) * (t1 - t0);

        Vector start = p1 + v1 * extraTime + acc1 * (0.5f * extraTime * extraTime);
        Vector end = p2 + v2 * extraTime + acc2 * (0.5f * extraTime * extraTime);

        Line line(nullptr, 0, 1, start, end);

        ASSERT_LE(std::abs(l.distance({{pos, Vector(0, 0)}, t0 + extraTime}) - line.distance(pos)), 0.001f);
    }
}

TEST(Obstacles, MovingLine_DerivativeDistance) {
    testDerivativeDistanceRandomizedMoving([](std::function<float()> random) {
        float radius = random() < 0 ? 0.1 : 5;
        float t0 = std::abs(random()) / 10;
        float t1 = t0 + std::abs(random()) / 5;
        Vector p1 = Vector(random(), random());
        Vector p2 = Vector(random(), random());
        Vector v1 = Vector(random(), random()) / 5;
        Vector v2 = Vector(random(), random()) / 5;
        Vector acc1 = Vector(random(), random()) / 5;
        Vector acc2 = Vector(random(), random()) / 5;
        return std::make_unique<MovingLine>(0, radius, p1, v1, acc1, p2, v2, acc2, t0, t1);
    });
}

TEST(Obstacles, MovingLine_BoundingBox_Randomized) {
    const float BOX_SIZE = 20.0f;
    std::mt19937 r(0);
    auto makeFloat = [&]() {
        return r() / float(r.max()) * BOX_SIZE - BOX_SIZE * 0.5f;
    };

    for (int i = 0;i<1000;i++) {
        float radius = makeFloat() < 0 ? 0.1 : 5;
        float t0 = std::abs(makeFloat()) / 10;
        float t1 = t0 + std::abs(makeFloat()) / 5;
        Vector p1 = Vector(makeFloat(), makeFloat());
        Vector p2 = Vector(makeFloat(), makeFloat());
        Vector v1 = Vector(makeFloat(), makeFloat()) / 5;
        Vector v2 = Vector(makeFloat(), makeFloat()) / 5;
        Vector acc1 = Vector(makeFloat(), makeFloat()) / 5;
        Vector acc2 = Vector(makeFloat(), makeFloat()) / 5;
        MovingLine l(0, radius, p1, v1, acc1, p2, v2, acc2, t0, t1);

        BoundingBox b = l.boundingBox();

        BoundingBox ref(p1, p2);

        const int ITERATIONS = 1000;
        Vector last1 = p1;
        Vector last2 = p2;
        float maxDiff = 0;
        for (int i = 0;i<ITERATIONS;i++) {
            float t = (t1 - t0) * float(i) / (ITERATIONS - 1);
            Vector pos1 = p1 + v1 * t + acc1 * (0.5f * t * t);
            Vector pos2 = p2 + v2 * t + acc2 * (0.5f * t * t);
            ref.mergePoint(pos1);
            ref.mergePoint(pos2);
            maxDiff = std::max(maxDiff, pos1.distance(last1));
            last1 = pos1;
            maxDiff = std::max(maxDiff, pos2.distance(last2));
            last2 = pos2;
        }
        ref.addExtraRadius(radius);

        float maxError = 2 * maxDiff;
        ASSERT_LE(std::abs(b.top - ref.top), maxError);
        ASSERT_LE(std::abs(b.bottom - ref.bottom), maxError);
        ASSERT_LE(std::abs(b.left - ref.left), maxError);
        ASSERT_LE(std::abs(b.right - ref.right), maxError);

    }
}

TEST(Obstacles, FriendlyRobot_Distance) {
    std::vector<TrajectoryPoint> points{{{Vector(0, 0), Vector(0, 0)}, 0},
                                        {{Vector(0.5, 0), Vector(0, 0)}, 0.5},
                                        {{Vector(1, 0), Vector(0, 0)}, 1},
                                        {{Vector(1, 0.5), Vector(0, 0)}, 1.5}};
    FriendlyRobotObstacle o(&points, 0.5, 0);

    ASSERT_FLOAT_EQ(o.distance({{Vector(0, 0), Vector(0, 0)}, 0}), -0.5);
    ASSERT_FLOAT_EQ(o.distance({{Vector(1, 0.5), Vector(0, 0)}, 4}), -0.5);
    ASSERT_FLOAT_EQ(o.distance({{Vector(2, 0), Vector(0, 0)}, 1.25}), 0.5);
}

TEST(Obstacles, FriendlyRobot_Intersects) {
    std::vector<TrajectoryPoint> points{{{Vector(0, 0), Vector(0, 0)}, 0},
                                        {{Vector(0.5, 0), Vector(0, 0)}, 0.5},
                                        {{Vector(1, 0), Vector(0, 0)}, 1},
                                        {{Vector(1, 0.5), Vector(0, 0)}, 1.5}};
    FriendlyRobotObstacle o(&points, 0.5, 0);

    ASSERT_TRUE(o.intersects({{Vector(0, 0), Vector(0, 0)}, 0}));
    ASSERT_TRUE(o.intersects({{Vector(0.49, 0), Vector(0, 0)}, 0}));
    ASSERT_TRUE(o.intersects({{Vector(0.49, 0), Vector(0, 0)}, 0.49}));
    ASSERT_TRUE(o.intersects({{Vector(1, 0), Vector(0, 0)}, 1}));
    ASSERT_TRUE(o.intersects({{Vector(1, 0.5), Vector(0, 0)}, 10}));
    ASSERT_FALSE(o.intersects({{Vector(1, 0.5), Vector(0, 0)}, 0}));
    ASSERT_FALSE(o.intersects({{Vector(2, 0), Vector(0, 0)}, 1.2}));
}

TEST(Obstacles, FriendlyRobot_ZonedDistance) {
    std::vector<TrajectoryPoint> points{{{Vector(0, 0), Vector(0, 0)}, 0},
                                        {{Vector(0.5, 0), Vector(0, 0)}, 0.5},
                                        {{Vector(1, 0), Vector(0, 0)}, 1},
                                        {{Vector(1, 0.5), Vector(0, 0)}, 1.5}};
    FriendlyRobotObstacle o(&points, 0.5, 0);

    ASSERT_LE(o.zonedDistance({{Vector(0, 0), Vector(0, 0)}, 0}, 0.1), 0);
    ASSERT_LE(o.zonedDistance({{Vector(0.49, 0), Vector(0, 0)}, 0}, 0.1), 0);
    ASSERT_LE(o.zonedDistance({{Vector(0.49, 0), Vector(0, 0)}, 0.49}, 0.1), 0);
    ASSERT_LE(o.zonedDistance({{Vector(1, 0), Vector(0, 0)}, 1}, 0.1), 0);
    ASSERT_LE(o.zonedDistance({{Vector(1, 0.5), Vector(0, 0)}, 10}, 0.1), 0);
    ASSERT_GE(o.zonedDistance({{Vector(1, 0.5), Vector(0, 0)}, 0}, 0.1), 0.1);
    ASSERT_GE(o.zonedDistance({{Vector(2, 0), Vector(0, 0)}, 1.2}, 0.1), 0.1);
    ASSERT_LE(o.zonedDistance({{Vector(1.7, 0), Vector(0, 0)}, 1.2}, 0.3), 0.3);
}

TEST(Obstacles, FriendlyRobot_BoundingBox) {
    std::vector<TrajectoryPoint> points{{{Vector(0, 0), Vector(0, 0)}, 0},
                                        {{Vector(0.5, 0), Vector(0, 0)}, 0.5},
                                        {{Vector(1, 0), Vector(0, 0)}, 1},
                                        {{Vector(1, 0.5), Vector(0, 0)}, 1.5}};
    FriendlyRobotObstacle o(&points, 0.5, 0);

    auto b = o.boundingBox();

    ASSERT_FLOAT_EQ(b.left, -0.5);
    ASSERT_FLOAT_EQ(b.right, 1.5);
    ASSERT_FLOAT_EQ(b.top, 1);
    ASSERT_FLOAT_EQ(b.bottom, -0.5);
}
