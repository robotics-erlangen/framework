/***************************************************************************
 *   Copyright 2022 Andreas Wendler                                        *
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
#include "core/rng.h"
#include "path/escapeobstaclesampler.h"
#include "path/worldinformation.h"
#include "path/alphatimetrajectory.h"

#include <functional>

static WorldInformation constructWorld() {
    WorldInformation world;
    world.setRadius(0.08f);
    world.setBoundary(-10, -10, 10, 10); // just some dummy field
    world.setOutOfFieldObstaclePriority(50);
    world.setRobotId(0);
    world.clearObstacles();
    return world;
}

static TrajectoryInput constructBasicInput(Vector s0, Vector s1) {
    TrajectoryInput input;
    input.start = RobotState(s0, Vector(0, 0));
    input.target = RobotState(s1, Vector(0, 0));
    input.t0 = 0;
    input.exponentialSlowDown = input.target.speed == Vector(0, 0);
    input.maxSpeed = 3;
    input.maxSpeedSquared = input.maxSpeed * input.maxSpeed;
    input.acceleration = 3.5;
    return input;
}

static Vector optimizeEscape(std::function<void(WorldInformation&)> obstacleAdder,
                                   const TrajectoryInput &input)
{
    const int ITERATIONS = 200;

    WorldInformation world = constructWorld();
    obstacleAdder(world);
    world.collectObstacles();

    PathDebug debug;
    RNG rng(1);

    EscapeObstacleSampler sampler(&rng, world, debug);

    // is equivalent to having more samples in the compute function -> should be close to the optimal solution
    for (int i = 0;i<ITERATIONS;i++) {
        sampler.compute(input);
    }

    auto result = sampler.getResult();

    if (result.size() == 0) {
        return Vector(0, 0);
    }

    return result[0].endPosition() - input.start.pos;
}

// tests the complete optimization
TEST(EscapeObstacleSampler, WholeSampling) {
    // with no start speed, all trajectories generated are straight lines, so checking the endpoint is fine

    // take the fastest way out of a large obstacle
    {
        Vector s0(0, 0);
        Vector s1(-9, 5);
        TrajectoryInput input = constructBasicInput(s0, s1);
        auto addObst = [](WorldInformation &world) {
            world.addRect(-8, -20, 20, 20, "field wide rect", 50, 0);
        };

        Vector direction = optimizeEscape(addObst, input);

        ASSERT_LE(direction.x, -8); // to the left out of the obstacle
        ASSERT_LE(std::abs(direction.y), std::abs(direction.x / 10)); // mostly straight
    }

    // TODO: test the above test for more obstacle types

    // do not enter a higher priority obstacle (go around it)
    {
        Vector s0(0, 0);
        Vector s1(0, 6);
        TrajectoryInput input = constructBasicInput(s0, s1);
        // a higher prio obstacle box open to the bottom (where the low prio obstacle extends farther
        auto addObst = [](WorldInformation &world) {
            world.addRect(-2, 2, 2, -4, "mid rect", 1, 0);
            world.addRect(-2, -2, -1, 2, "box left", 100, 0);
            world.addRect(-2, 2, 2, 1, "box up", 100, 0);
            world.addRect(1, 2, 2, -2, "box right", 100, 0);
        };

        Vector direction = optimizeEscape(addObst, input);

        // TODO: fix and enable again
//        ASSERT_LE(direction.y, -4); // exits on the bottom of the obstacle
//        ASSERT_LE(std::abs(direction.x), std::abs(direction.y / 10)); // mostly straight
    }

    // do not enter a higher priority obstacle (trapped in an obstacle box)
    {
        Vector s0(0, 0);
        Vector s1(6, 6);
        TrajectoryInput input = constructBasicInput(s0, s1);
        auto addObst = [](WorldInformation &world) {
            world.addCircle(0, 0, 5, "mid circle", 0);
            world.addRect(-2, -2, -1, 2, "box left", 100, 0);
            world.addRect(-2, 2, 2, 1, "box up", 100, 0);
            world.addRect(1, 2, 2, -2, "box right", 100, 0);
            world.addRect(-2, -2, 2, -1, "box down", 100, 0);
        };

        // TODO: fix and enable again
        Vector direction = optimizeEscape(addObst, input);
//        ASSERT_LE(direction.distance(Vector(1, 1)), 0.1);
        // TODO: check max intersecting obstacle prio??
    }

    // go through lower prio obstacles to escape
    {
        Vector s0(0, 1);
        Vector s1(-9, 1);
        TrajectoryInput input = constructBasicInput(s0, s1);
        auto addObst = [](WorldInformation &world) {
            world.addRect(-2, -20, 4, 20, "wide rect", 50, 0);
            world.addRect(-2, -20, -1, 20, "smaller rect", 10, 0);
        };

        Vector direction = optimizeEscape(addObst, input);

        ASSERT_LE(direction.x, -2); // to the left out of the obstacle
        ASSERT_LE(std::abs(direction.y), std::abs(direction.x / 10)); // mostly straight
    }

    // if the target is also in the obstacle and there is no way out of the obstacle, just drive to it
    {
        Vector s0(0, 0);
        Vector s1(5, 3);
        TrajectoryInput input = constructBasicInput(s0, s1);
        auto addObst = [](WorldInformation &world) {
            world.addRect(-20, -20, 20, 20, "field wide rect", 50, 0);
        };

        Vector direction = optimizeEscape(addObst, input);

        // TODO: fix and enable again
//        ASSERT_LE(direction.distance(s1), 0.3);
    }
}
