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
