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

#include "common.h"
#include "core/rng.h"
#include "path/alphatimetrajectory.h"
#include "path/trajectorypath.h"
#include "seshat/logfilewriter.h"
#include "protobuf/status.h"

#include <QDebug>

const float MAX_SPEED = 3.0f;
const float ACCELERATION = 3.0f;
const float ROBOT_RADIUS = 0.09f;

struct Scenario {
    CollisionTestType testType;

    RobotState ownStart;
    Vector targetPos;

    RobotState oppStart;
    // only for testType == RANDOM
    Vector opponentAcceleration;
};

static RobotState updateRobotConstantAcceleration(const RobotState &robot, const Vector acc, const float maxSpeed, const float maxAccel = ACCELERATION)
{
    const Vector acceleration = acc.length() < maxAccel ? acc : (acc.normalized() * maxAccel);
    const float t = 0.01f;
    const Vector speed = robot.speed + acceleration * t;
    const Vector withMaxSpeed = speed.length() < maxSpeed ? speed : (speed.normalized() * maxSpeed);
    const Vector pos = robot.pos + robot.speed * t + acceleration * (0.5f * t * t);
    return RobotState(pos, withMaxSpeed);
}

static RobotState updateOpponent(const RobotState &opp, const Scenario &s, const RobotState &friendlyRobot)
{
    if (s.testType == CollisionTestType::BLOCKED_LINE) {
        return RobotState(Vector(opp.pos.x, friendlyRobot.pos.y), Vector(0, friendlyRobot.speed.y));
    } else if (s.testType == CollisionTestType::ADVERSARIAL) {
        const Vector target = friendlyRobot.pos;
        const RobotState targetState(target, friendlyRobot.speed * (-1));
        const auto evil = AlphaTimeTrajectory::findTrajectory(opp, targetState, ACCELERATION, MAX_SPEED, 0, EndSpeed::FAST);
        if (evil) {
            return evil->stateAtTime(0.01f);
        }
    }
    return updateRobotConstantAcceleration(opp, s.opponentAcceleration, MAX_SPEED);
}

static RobotState robotAtTime(const RobotState &robot, const Vector acc, const float time)
{
    if (acc.length() < 0.001f) {
        return RobotState(robot.pos + robot.speed * time, robot.speed);
    }
    const float a = acc.x * acc.x + acc.y * acc.y;
    const float b = robot.speed.x * acc.x + robot.speed.y * acc.y;
    const float c = robot.speed.x * robot.speed.x + robot.speed.y * robot.speed.y - MAX_SPEED * MAX_SPEED;
    const float maxSpeedTime = (-b + std::sqrt(b * b - 4 * a * c)) / (2.0f * a);
    if (time < maxSpeedTime) {
        const Vector pos = robot.pos + robot.speed * time + acc * (0.5f * time * time);
        const Vector speed = robot.speed + acc * time;
        return RobotState(pos, speed);
    }
    const Vector maxSpeedPos = robot.pos + robot.speed * maxSpeedTime + acc * (0.5f * maxSpeedTime * maxSpeedTime);
    const Vector maxSpeedSpeed = robot.speed + acc * maxSpeedTime;
    const float extraTime = time - maxSpeedTime;
    const Vector maxSpeedDist = maxSpeedSpeed * extraTime;
    return RobotState(maxSpeedPos + maxSpeedDist, maxSpeedSpeed);
}

static RobotState robotOnTrajectory(const std::vector<TrajectoryPoint> &trajectory, float time)
{
    if (trajectory.size() == 0) {
        return RobotState(Vector(0, 0), Vector(0, 0));
    }
    for (unsigned int i = 0;i < trajectory.size() - 1;i++) {
        const TrajectoryPoint next = trajectory[i + 1];
        if (next.time > time) {
            const TrajectoryPoint current = trajectory[i];
            const float tFactor = (time - current.time) / (next.time - current.time);
            const Vector v = current.state.speed +  (next.state.speed - current.state.speed) * tFactor;
            const Vector pos = current.state.pos + (current.state.speed + v) * 0.5 * (time - current.time);
            return RobotState(pos, v);
        }
    }
    return RobotState(trajectory[trajectory.size() - 1].state.pos, trajectory[trajectory.size() - 1].state.speed);
}

static bool isCollision(const RobotState &own, const RobotState &opp)
{
    if (own.pos.distance(opp.pos) > ROBOT_RADIUS * 2) {
        return false;
    }
    const Vector betweenRobots = (opp.pos - own.pos).normalized();
    const float projectedSpeedDiff = std::abs(betweenRobots.dot(own.speed - opp.speed));
    if (projectedSpeedDiff > 1.5f) {
        // both robots are at fault
        if (std::abs(own.speed.length() - opp.speed.length()) < 0.3f) {
            return true;
        }
        // true iff the own robot is at fault
        return own.speed.length() > opp.speed.length();
    }
    return false;
}

static void writeRobot(world::Robot *outRobot, const RobotState &robot)
{
    outRobot->set_id(0);
    outRobot->set_p_x(robot.pos.x);
    outRobot->set_p_y(robot.pos.y);
    outRobot->set_phi(0);
    outRobot->set_v_x(robot.speed.x);
    outRobot->set_v_y(robot.speed.y);
    outRobot->set_omega(0);
}

static float valueToRating(float value, float zero, float one)
{
    return std::max(0.0f, std::min(1.0f, (value - zero) / (one - zero)));
}

static void addSimpleRobotObstacle(TrajectoryPath &path, const RobotState &friendlyRobot, const RobotState &opponent)
{
    const float SLOW_ROBOT = 0.3;
    const float estimationTime = 0.1; // just a fixed time for now
    const float MAX_NO_FOUL_SPEED = 0.5;
    const bool robotIsSlow = friendlyRobot.speed.length() < MAX_NO_FOUL_SPEED;

    float safetyDistance = std::max(0.0f, valueToRating(friendlyRobot.speed.distance(opponent.speed), 0.0f, 1.25f) * 0.15f - 0.05f);
    if (friendlyRobot.speed.length() < 0.5f) {
        safetyDistance = std::min(safetyDistance, 0.02f);
    }
    if (friendlyRobot.speed.length() < SLOW_ROBOT && opponent.speed.length() < SLOW_ROBOT) {
        safetyDistance = safetyDistance - 0.02;
    }
    const Vector estimatedPosition = opponent.pos + opponent.speed * estimationTime;

    const float absSpeed = opponent.speed.length();
    const float brakeTime = absSpeed / ACCELERATION;
    if (brakeTime < estimationTime) {
        path.world().addLine(opponent.pos.x, opponent.pos.y, estimatedPosition.x, estimatedPosition.y, ROBOT_RADIUS + safetyDistance, nullptr, 80);
    } else {
        const float leavingTime = (-absSpeed + std::sqrt(absSpeed * absSpeed + 2 * ACCELERATION * (absSpeed * estimationTime + ROBOT_RADIUS))) / ACCELERATION;
        path.world().addMovingLine(opponent.pos, Vector(0, 0), Vector(0, 0), estimatedPosition, Vector(0, 0),
                                   Vector(0, 0), 0, leavingTime, ROBOT_RADIUS + safetyDistance, 80);
    }
    if (!robotIsSlow) {
        path.world().addMovingCircle(opponent.pos, opponent.speed, Vector(0, 0), 0, 0.8f, ROBOT_RADIUS + safetyDistance, 80);
    }
}

static bool testScenarioCollision(const Scenario &s, QString logname, bool useOldObstacle)
{
    TrajectoryPath path(1234, nullptr, pathfinding::InputSourceType::None);
    path.world().setRadius(ROBOT_RADIUS);
    path.world().setBoundary(-6, -6, 6, 6);
    path.world().setRobotId(0);
    path.world().setOutOfFieldObstaclePriority(1);

    LogFileWriter logfile;
    Status currentStatus;
    bool writeLog = logname.length() > 0;
    if (writeLog) {
        if (!logfile.open(logname)) {
            writeLog = false;
        } else {
            path.connect(&path, &AbstractPath::gotVisualization, [&currentStatus](const amun::Visualization &vis) {
                currentStatus->mutable_debug(0)->add_visualization()->CopyFrom(vis);
            });
            path.connect(&path, &AbstractPath::gotDebug, [&currentStatus](const amun::DebugValue &debug) {
                currentStatus->mutable_debug(0)->add_value()->CopyFrom(debug);
            });
        }
    }

    RobotState currentRobot = s.ownStart;
    RobotState currentOpponent = s.oppStart;
    float currentTime = 0;
    while (true) {
        if (writeLog) {
            const qint64 time = currentTime * 1e9 + 10000000;
            Status status(new amun::Status);
            amun::DebugValues *debug = status->add_debug();
            debug->set_source(amun::DebugSource::StrategyYellow);

            currentStatus = status;
            status->set_time(time);
            world::State *world = status->mutable_world_state();
            world->set_time(time);
            world::Robot *ownRobot = world->add_yellow();
            writeRobot(ownRobot, currentRobot);
            world::Robot *oppRobot = world->add_blue();
            writeRobot(oppRobot, currentOpponent);
        }

        if (isCollision(currentRobot, currentOpponent) && !writeLog) {
            return true;
        } else if (currentRobot.pos.distance(currentOpponent.pos) < ROBOT_RADIUS * 2 && !writeLog) {
            // once a collision has happened but we are not at fault, it is pointless to continue
            return false;
        }

        path.clearObstacles();
        if (useOldObstacle) {
            addSimpleRobotObstacle(path, currentRobot, currentOpponent);
        } else {
            path.world().addOpponentRobotObstacle(currentOpponent.pos, currentOpponent.speed, 80);
        }

        const auto trajectory = path.calculateTrajectory(currentRobot.pos, currentRobot.speed, s.targetPos, Vector(0, 0), MAX_SPEED, ACCELERATION);

        currentOpponent = updateOpponent(currentOpponent, s, currentRobot);
        const RobotState nextRobot = robotOnTrajectory(trajectory, 0.01f);
        // limit acceleration
        if (path.maxIntersectingObstaclePrio() == 80) {
            currentRobot = updateRobotConstantAcceleration(currentRobot, currentRobot.speed * (-5), MAX_SPEED, ACCELERATION);
        } else {
            const Vector acc = (nextRobot.speed - currentRobot.speed) / 0.01f;
            currentRobot = updateRobotConstantAcceleration(currentRobot, acc, MAX_SPEED, ACCELERATION);
        }

        currentTime += 0.01f;

        const float MAX_TIME = s.testType == CollisionTestType::RANDOM ? 5 : 3;
        if (currentTime > MAX_TIME) {
            return false;
        }

        if (writeLog) {
            logfile.writeStatus(currentStatus);
        }

        if (currentRobot.speed.length() < 0.001f && currentRobot.pos.distance(s.targetPos) < 0.01f) {
            break;
        }
    }
    return false;
}

static bool opponentCloseToRobot(const Scenario &s)
{
    const RobotState targetState(s.targetPos, Vector(0, 0));
    const auto direct = AlphaTimeTrajectory::findTrajectory(s.ownStart, targetState, ACCELERATION, MAX_SPEED, 0, EndSpeed::EXACT);
    if (!direct) {
        return true;
    }
    const float totalTime = direct->time() + 0.5f;
    const float timeInterval = 0.01f;
    const int DIVISIONS = std::min(300, std::max(3, int(totalTime / timeInterval)));
    RobotState currentOpponent = s.oppStart;
    for (int i = 0;i<DIVISIONS;i++) {
        const float time = i * timeInterval;
        const auto ownState = direct->stateAtTime(time);
        const float dist = currentOpponent.pos.distance(ownState.pos);
        if (dist < 0.3f) {
            return true;
        }
        currentOpponent = updateOpponent(currentOpponent, s, ownState);
    }
    return false;
}

static Vector randomSpeed(RNG &rng)
{
    Vector result;
    do {
        result = Vector(rng.uniformFloat(-2, 2), rng.uniformFloat(-2, 2));
    } while (result.length() > MAX_SPEED * 0.99f);
    return result;
}

static bool isCollisionAvoidable(RNG &rng, const Scenario &s)
{
    for (int j = 0;j<200;j++) {
        bool collision = false;
        const Vector ownAcc = rng.normalVector(1).normalized() * ACCELERATION;
        RobotState currentOpponent = s.oppStart;
        for (int i = 0;i<100;i++) {
            const float time = i * 0.01f;
            const RobotState ownRobot = robotAtTime(s.ownStart, ownAcc, time);
            if (ownRobot.pos.distance(currentOpponent.pos) < ROBOT_RADIUS * 2) {
                collision = true;
            }
            currentOpponent = updateOpponent(currentOpponent, s, ownRobot);
        }
        if (!collision) {
            return true;
        }
    }
    return false;
}

int testCollisions(CollisionTestType testType, int scenarioCount, bool useOldObstacle, bool writeLogs)
{
    RNG rng(1234);
    int collisions = 0;
    int total = 0;
    for (int i = 0;total<scenarioCount;i++) {
        rng.seed(i);
        Scenario s;
        s.testType = testType;
        s.ownStart.pos = Vector(0, 0);
        s.ownStart.speed = randomSpeed(rng);
        s.targetPos = Vector(rng.uniformFloat(0, 5), 0);

        if (testType == CollisionTestType::RANDOM) {
            s.oppStart.pos = Vector(rng.uniformFloat(-3, 7), rng.uniformFloat(-4, 4));
            s.oppStart.speed = randomSpeed(rng);
            s.opponentAcceleration = rng.normalVector(1).normalized() * rng.uniformFloat(0, ACCELERATION);
        } else if (testType == CollisionTestType::BLOCKED_LINE) {
            const float brakeDist = s.ownStart.speed.x / ACCELERATION;
            if (s.targetPos.x < brakeDist) {
                continue;
            }
            s.oppStart.pos = Vector(rng.uniformFloat(std::max(0.0f, brakeDist) + 2 * ROBOT_RADIUS, s.targetPos.x + 2 * ROBOT_RADIUS), 0);
            s.oppStart.speed = Vector(0, s.ownStart.speed.y);
        } else {
            const float brakeDist = s.ownStart.speed.x / ACCELERATION;
            if (s.targetPos.x < brakeDist) {
                continue;
            }
            s.oppStart.pos = Vector(rng.uniformFloat(std::max(0.0f, brakeDist) + 2 * ROBOT_RADIUS, s.targetPos.x + 2 * ROBOT_RADIUS), 0);
            s.oppStart.speed = Vector(-s.ownStart.speed.x, s.ownStart.speed.y);
        }

        if (testType == CollisionTestType::BLOCKED_LINE || (opponentCloseToRobot(s) && isCollisionAvoidable(rng, s))) {
            if (testScenarioCollision(s, "", useOldObstacle)) {
                if (writeLogs) {
                testScenarioCollision(s, QString("collisiontest-%1.log").arg(i), useOldObstacle);
                std::cout <<"collision with seed: "<<i<<std::endl;
                }
                collisions++;
            }
            total++;
        }
    }
    return collisions;
}
