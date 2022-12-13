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
#include "path/trajectorypath.h"
#include "core/rng.h"
#include "core/protobuffilesaver.h"
#include "core/protobuffilereader.h"

#include <iostream>

static Vector makePos(RNG &rng, float fieldSizeHalf) {
    return rng.uniformVectorIn(Vector(-fieldSizeHalf, -fieldSizeHalf), Vector(fieldSizeHalf, fieldSizeHalf));
}

TEST(TrajectoryPath, calculateTrajectory) {
    constexpr int RUNS = 100;

    for (int i = 0; i < RUNS; i++) {
        RNG rng(i+1);

        const float SAMPLE_RADIUS = 5;

        TrajectoryPath path(i, nullptr, pathfinding::None);
        path.world().setBoundary(-SAMPLE_RADIUS, -SAMPLE_RADIUS, SAMPLE_RADIUS, SAMPLE_RADIUS);
        path.world().setRobotId(1);
        path.world().setRadius(0.09f);


        const Vector startPos = makePos(rng, SAMPLE_RADIUS);
        const Vector startSpeed = makePos(rng, -1.5f);
        const Vector endPos = makePos(rng, SAMPLE_RADIUS);

        for (int j = 0;j<5;j++) {
            const Vector pos = makePos(rng, SAMPLE_RADIUS);
            const float radius = rng.uniformFloat(0.01f, 1.0f);
            path.world().addCircle(pos.x, pos.y, radius, nullptr, 42);
        }

        path.calculateTrajectory(startPos, startSpeed, endPos, Vector{0, 0}, 3, 3);

        const auto obstaclePoints = path.getCurrentTrajectory();
        const float desiredInterval = obstaclePoints->at(1).time - obstaclePoints->at(0).time;
        for (std::size_t i = 1;i<obstaclePoints->size();i++) {
            const float interval = obstaclePoints->at(i).time - obstaclePoints->at(i-1).time;
            ASSERT_LE(std::abs(desiredInterval - interval), 0.0001f);
        }

        ASSERT_EQ(obstaclePoints->at(0).time, 0);
    }
}

TEST(TrajectoryPath, serialize) {

    QString filename{"temp"};
    QString fileStart{"TEST"};
    ProtobufFileSaver saver(filename, fileStart);
    TrajectoryPath path(1, &saver, pathfinding::InputSourceType::AllSamplers);
    WorldInformation &world = path.world();
    world.setRadius(0.07f);
    world.setRobotId(5);
    world.setBoundary(-3, -3, 3, 3);
    world.setOutOfFieldObstaclePriority(91);

    world.addCircle(1, 2, 3, nullptr, 4);
    world.addLine(1, 2, 3, 4, 5, nullptr, 6);
    world.addRect(1, 2, 3, 4, nullptr, 5, 6);
    world.addTriangle(1, 2, 3, 4, 5, 6, 7, nullptr, 8);
    world.addMovingCircle(Vector{0, 1}, Vector{2, 3}, Vector{0, 0.1}, 5, 6, 0.1, 8);
    world.addMovingLine(Vector{5, 6}, Vector{7, 8}, Vector{9, 10}, Vector{11, 12}, Vector{13, 14}, Vector{15, 16}, 11, 12, 0.15, 42);
    world.addOpponentRobotObstacle(Vector{3, 4}, Vector{5, 6}, 7);

    std::vector<TrajectoryPoint> friendlyObstacle = {{{Vector{0, 0}, Vector{1, 1}}, 0}, {{Vector{2, 2}, Vector{0, 0}}, 1},
                                                    {{Vector{3, 3}, Vector{1, 0}}, 2}, {{Vector{4, 4}, Vector{0, 1}}, 3}};
    world.addFriendlyRobotTrajectoryObstacle(&friendlyObstacle, 9, 0.2f);

    path.calculateTrajectory(Vector{0, 0}, Vector{1, 1}, Vector{2, 2}, Vector{3, 3}, 4, 5);

    // otherwise the file could not be opened in the file reader
    saver.close();

    pathfinding::PathFindingTask situation;
    ProtobufFileReader reader;
    ASSERT_TRUE(reader.open(filename, fileStart));
    ASSERT_TRUE(reader.readNext(situation));
    ASSERT_TRUE(situation.has_state());

    TrajectoryPath recPath{3, nullptr, pathfinding::InputSourceType::None};
    WorldInformation &reconstructed = recPath.world();
    reconstructed.deserialize(situation.state());

    recPath.calculateTrajectory(Vector{0, 0}, Vector{1, 1}, Vector{2, 2}, Vector{3, 3}, 4, 5);

    ASSERT_EQ(world.radius(), reconstructed.radius());
    ASSERT_EQ(world.robotId(), reconstructed.robotId());
    ASSERT_EQ(world.boundary(), reconstructed.boundary());
    ASSERT_EQ(world.outOfFieldPriority(), reconstructed.outOfFieldPriority());

    ASSERT_EQ(world.obstacles().size(), reconstructed.obstacles().size());

    const auto &originalObstacles = world.obstacles();
    const auto &reconstructedObstacles = reconstructed.obstacles();

    ASSERT_TRUE(std::equal(originalObstacles.begin(), originalObstacles.end(), reconstructedObstacles.begin(),
                           [](const Obstacles::Obstacle *a, const Obstacles::Obstacle *b) { return (*a) == (*b); }));
}
