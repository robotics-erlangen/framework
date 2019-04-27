/***************************************************************************
 *   Copyright 2019 Andreas Wendler                                        *
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

#include "trajectorypath.h"
#include "core/rng.h"

bool TrajectoryPath::MovingCircle::intersects(Vector pos, float time) const
{
    if (time < startTime || time > endTime) {
        return false;
    }
    float t = time - startTime;
    Vector centerAtTime = startPos + speed * t + acc * (0.5f * t * t);
    return centerAtTime.distanceSq(pos) < radius * radius;
}

float TrajectoryPath::MovingCircle::distance(Vector pos, float time) const
{
    if (time < startTime || time > endTime) {
        return std::numeric_limits<float>::max();
    }
    float t = time - startTime;
    Vector centerAtTime = startPos + speed * t + acc * (0.5f * t * t);
    return centerAtTime.distance(pos) - radius;
}

bool TrajectoryPath::MovingLine::intersects(Vector pos, float time) const
{
    if (time < startTime || time > endTime) {
        return false;
    }
    float t = time - startTime;
    const Vector p1 = startPos1 + speed1 * t + acc1 * (0.5f * t * t);
    const Vector p2 = startPos2 + speed2 * t + acc2 * (0.5f * t * t);
    return LineSegment(p1, p2).distance(pos) < width;
}

float TrajectoryPath::MovingLine::distance(Vector pos, float time) const
{
    if (time < startTime || time > endTime) {
        return std::numeric_limits<float>::max();
    }
    const Vector p1 = startPos1 + speed1 * time;
    const Vector p2 = startPos2 + speed2 * time;
    return LineSegment(p1, p2).distance(pos) - width;
}

bool TrajectoryPath::FriendlyRobotObstacle::intersects(Vector pos, float time) const
{
    unsigned long index = std::max(0UL, std::min(trajectory->size()-1, static_cast<unsigned long>(time / timeInterval)));
    return (*trajectory)[index].pos.distanceSq(pos) < radius * radius;
}

float TrajectoryPath::FriendlyRobotObstacle::distance(Vector pos, float time) const
{
    unsigned long index = std::max(0UL, std::min(trajectory->size()-1, static_cast<unsigned long>(time / timeInterval)));
    return (*trajectory)[index].pos.distance(pos) - radius;
}


TrajectoryPath::TrajectoryPath(uint32_t rng_seed) :
    AbstractPath(rng_seed)
{ }

void TrajectoryPath::reset()
{
    // TODO: reset internal state
}

std::vector<TrajectoryPath::Point> TrajectoryPath::calculateTrajectory(Vector s0, Vector v0, Vector s1, Vector v1, float maxSpeed, float acceleration)
{
    this->v0 = v0;
    this->v1 = v1;
    this->distance = s1 - s0;
    this->s0 = s0;
    this->s1 = s1;
    exponentialSlowDown = v1 == Vector(0, 0);
    MAX_SPEED = maxSpeed;
    MAX_SPEED_SQUARED = maxSpeed * maxSpeed;
    ACCELERATION = acceleration;

    findPathAlphaT();
    return getResultPath();
}

void TrajectoryPath::clearObstaclesCustom()
{
    m_movingCircles.clear();
    m_movingLines.clear();
    m_friendlyRobotObstacles.clear();
}

void TrajectoryPath::addMovingCircle(Vector startPos, Vector speed, Vector acc, float startTime, float endTime, float radius, int prio)
{
    MovingCircle m;
    m.startPos = startPos;
    m.speed = speed;
    m.acc = acc;
    m.startTime = startTime;
    m.endTime = endTime;
    m.radius = radius + m_radius;
    m.prio = prio;
    m_movingCircles.push_back(m);
}

void TrajectoryPath::addMovingLine(Vector startPos1, Vector speed1, Vector acc1, Vector startPos2, Vector speed2,
                                   Vector acc2, float startTime, float endTime, float width, int prio)
{
    MovingLine l;
    l.startPos1 = startPos1;
    l.speed1 = speed1;
    l.acc1 = acc1;
    l.startPos2 = startPos2;
    l.speed2 = speed2;
    l.acc2 = acc2;
    l.startTime = startTime;
    l.endTime = endTime;
    l.width = width + m_radius;
    l.prio = prio;
    m_movingLines.push_back(l);
}

void TrajectoryPath::addFriendlyRobotTrajectoryObstacle(std::vector<Point> *obstacle, int prio, float radius)
{
    // the path finding of the other robot could not find a path
    if (obstacle->size() == 0) {
        return;
    }
    float maxDistSq = 0;
    for (const Point &p : *obstacle) {
        maxDistSq = std::max(maxDistSq, p.pos.distanceSq((*obstacle)[0].pos));
    }
    if (maxDistSq < 0.03f * 0.03f) {
        addCircle(obstacle->at(0).pos.x, obstacle->at(0).pos.y, radius + std::sqrt(maxDistSq), nullptr, prio);
        return;
    }
    FriendlyRobotObstacle o;
    o.trajectory = obstacle;
    o.radius = radius + m_radius;
    o.prio = prio;
    o.timeInterval = obstacle->at(1).time - obstacle->at(0).time;
    m_friendlyRobotObstacles.push_back(o);
}

bool TrajectoryPath::isInStaticObstacle(Vector point) const
{
    if (!pointInPlayfield(point, m_radius)) {
        return true;
    }
    for (const auto obstacle : m_obstacles) {
        if (obstacle->distance(point) < m_radius) {
            return true;
        }
    }
    return false;
}

bool TrajectoryPath::isInMovingObstacle(Vector point, float time) const
{
    for (const auto &o : m_movingCircles) {
        if (o.intersects(point, time)) {
            return true;
        }
    }
    for (const auto &o : m_movingLines) {
        if (o.intersects(point, time)) {
            return true;
        }
    }
    for (const auto &o : m_friendlyRobotObstacles) {
        if (o.intersects(point, time)) {
            return true;
        }
    }
    return false;
}

bool TrajectoryPath::isTrajectoryInObstacle(const SpeedProfile &profile, float timeOffset, float slowDownTime, Vector startPos)
{
    float totalTime = slowDownTime > 0 ? profile.timeWithSlowDown(slowDownTime) : profile.time();
    for (int i = 0;i<40;i++) {
        float time = totalTime * i / 39.0f;
        Vector pos = slowDownTime > 0 ? profile.positionForTimeSlowDown(time, slowDownTime) : profile.positionForTime(time);
        if (isInStaticObstacle(pos + startPos)) {
            return true;
        }
        if (isInMovingObstacle(pos + startPos, time + timeOffset)) {
            return true;
        }
    }
    return false;
}

std::pair<float, float> TrajectoryPath::minObstacleDistance(const SpeedProfile &profile, float timeOffset, float slowDownTime, Vector startPos)
{
    float totalTime = slowDownTime > 0 ? profile.timeWithSlowDown(slowDownTime) : profile.time();
    float totalMinDistance = std::numeric_limits<float>::max();
    float lastPointDistance = 0;

    const int DIVISIONS = 40;
    for (int i = 0;i<DIVISIONS;i++) {
        float time = totalTime * i / float(DIVISIONS);
        Vector pos = slowDownTime > 0 ? profile.positionForTimeSlowDown(time, slowDownTime) : profile.positionForTime(time);
        if (!pointInPlayfield(pos + startPos, m_radius)) {
            return {-1.0f, -1.0f};
        }
        float minDistance = std::numeric_limits<float>::max();
        // static obstacles
        for (const auto obstacle : m_obstacles) {
            float d = obstacle->distance(pos + startPos) - m_radius;
            if (d <= 0) {
                return {d, d};
            }
            minDistance = std::min(minDistance, d);
        }
        // moving obstacles
        for (const auto &o : m_movingCircles) {
            float d = o.distance(pos + startPos, time + timeOffset);
            if (d <= 0) {
                return {d, d};
            }
            minDistance = std::min(minDistance, d);
        }
        for (const auto &o : m_movingLines) {
            float d = o.distance(pos + startPos, time + timeOffset);
            if (d <= 0) {
                return {d, d};
            }
            minDistance = std::min(minDistance, d);
        }
        for (const auto &o : m_friendlyRobotObstacles) {
            float d = o.distance(pos + startPos, time + timeOffset);
            if (d <= 0) {
                return {d, d};
            }
            minDistance = std::min(minDistance, d);
        }

        if (i == DIVISIONS-1) {
            lastPointDistance = minDistance;
        }
        totalMinDistance = std::min(totalMinDistance, minDistance);
    }
    return {totalMinDistance, lastPointDistance};
}

bool TrajectoryPath::checkMidPoint(Vector midSpeed, const float time, const float angle)
{
    // construct second part from mid point data
    if (!AlphaTimeTrajectory::isInputValidFastEndSpeed(midSpeed, v1, time, ACCELERATION)) {
        return false;
    }
    SpeedProfile secondPart = AlphaTimeTrajectory::calculateTrajectoryFastEndSpeed(midSpeed, v1, time, angle, ACCELERATION, MAX_SPEED);
    float secondPartTime;
    Vector secondPartOffset;
    // TODO: this code duplication is not good
    const float slowDownTime = exponentialSlowDown ? TOTAL_SLOW_DOWN_TIME : 0;
    if (exponentialSlowDown) {
        secondPartTime = secondPart.timeWithSlowDown(TOTAL_SLOW_DOWN_TIME);
        // TODO: specialized method for this
        secondPartOffset = secondPart.positionForTimeSlowDown(secondPartTime, TOTAL_SLOW_DOWN_TIME);
    } else {
        secondPartTime = secondPart.time();
        secondPartOffset = secondPart.positionForTime(secondPartTime);
    }
    if (secondPartTime > m_bestResultInfo.time) {
        return false;
    }

    // calculate first part trajectory
    Vector firstPartPosition = distance - secondPartOffset;
    float firstPartSlowDownTime = exponentialSlowDown ? std::max(0.0f, TOTAL_SLOW_DOWN_TIME - secondPartTime) : 0.0f;
    SpeedProfile firstPart = AlphaTimeTrajectory::findTrajectoryExactEndSpeed(v0, midSpeed, firstPartPosition, ACCELERATION, MAX_SPEED, firstPartSlowDownTime);
    if (!firstPart.isValid()) {
        return false;
    }
    float firstPartTime;
    if (exponentialSlowDown && firstPartSlowDownTime > 0) {
        firstPartTime = firstPart.timeWithSlowDown(firstPartSlowDownTime);
    } else {
        firstPartTime = firstPart.time();
    }
    float firstPartObstacleDist = minObstacleDistance(firstPart, 0, firstPartSlowDownTime, s0).first;
    if (firstPartObstacleDist <= 0) {
        return false;
    }
    // TODO: calculate the offset while calculating the trajectory
    auto secondPartObstacleDistances = minObstacleDistance(secondPart, firstPartTime, slowDownTime, s1 - secondPartOffset);
    if (secondPartObstacleDistances.first <= 0) {
        return false;
    }
    float minObstacleDist = std::min(firstPartObstacleDist, secondPartObstacleDistances.first);
    float obstacleDistExtraTime = 1;
    if (minObstacleDist < OBSTACLE_AVOIDANCE_RADIUS && secondPartObstacleDistances.second > OBSTACLE_AVOIDANCE_RADIUS) {
        obstacleDistExtraTime = OBSTACLE_AVOIDANCE_BONUS;
    }
    float biasedTrajectoryTime = (firstPartTime + secondPartTime) * obstacleDistExtraTime;
    if (biasedTrajectoryTime > m_bestResultInfo.time) {
        return false;
    }

    // trajectory is possible, better than previous trajectory
    m_bestResultInfo.time = biasedTrajectoryTime;
    m_bestResultInfo.centerTime = time;
    m_bestResultInfo.angle = angle;
    m_bestResultInfo.midSpeed = midSpeed;
    m_bestResultInfo.valid = true;

    m_generationInfo.clear();
    TrajectoryGenerationInfo infoFirstPart;
    infoFirstPart.time = firstPart.inputTime;
    infoFirstPart.angle = firstPart.inputAngle;
    infoFirstPart.slowDownTime = firstPartSlowDownTime;
    infoFirstPart.fastEndSpeed = false;
    infoFirstPart.v0 = v0;
    infoFirstPart.v1 = midSpeed;
    infoFirstPart.desiredDistance = firstPartPosition;
    m_generationInfo.push_back(infoFirstPart);

    TrajectoryGenerationInfo infoSecondPart;
    infoSecondPart.time = time;
    infoSecondPart.angle = angle;
    infoSecondPart.slowDownTime = slowDownTime;
    infoSecondPart.fastEndSpeed = true;
    infoSecondPart.v0 = midSpeed;
    infoSecondPart.v1 = v1;
    // TODO: this could go wrong if we want to stay at the current robot position
    infoSecondPart.desiredDistance = Vector(0, 0); // do not use desired distance calculation
    m_generationInfo.push_back(infoSecondPart);
    return true;
}

Vector TrajectoryPath::randomPointInField()
{
    return Vector(m_rng->uniformFloat(minX, fieldSize.x), m_rng->uniformFloat(minY, fieldSize.y));
}

Vector TrajectoryPath::randomSpeed()
{
    Vector testSpeed;
    do {
        testSpeed.x = m_rng->uniformFloat(-MAX_SPEED, MAX_SPEED);
        testSpeed.y = m_rng->uniformFloat(-MAX_SPEED, MAX_SPEED);
    } while (testSpeed.lengthSquared() > MAX_SPEED_SQUARED);
    return testSpeed;
}

bool TrajectoryPath::testEndPoint(Vector endPoint)
{
    if (endPoint.distance(distance) > m_bestEndPointDistance - 0.05f) {
        return false;
    }

    // no slowdown here, we are not even were we want to be
    SpeedProfile direct = AlphaTimeTrajectory::findTrajectoryExactEndSpeed(v0, Vector(0, 0), endPoint, ACCELERATION, MAX_SPEED, 0);
    if (!direct.isValid()) {
        return false;
    }
    if (isTrajectoryInObstacle(direct, 0, 0, s0)) {
        return false;
    }

    m_bestEndPointDistance = endPoint.distance(distance);
    m_bestResultInfo.valid = true;
    m_bestEndPoint = endPoint;

    m_generationInfo.clear();
    TrajectoryGenerationInfo info;
    info.time = direct.inputTime;
    info.angle = direct.inputAngle;
    info.slowDownTime = 0;
    info.fastEndSpeed = false;
    info.v0 = v0;
    info.v1 = Vector(0, 0);
    info.desiredDistance = endPoint;
    m_generationInfo.push_back(info);

    return true;
}

void TrajectoryPath::findPathEndInObstacle()
{
    // TODO: possibly dont use search trajectory generation but time and angle directly?
    // check last best end point
    float prevBestDistance = m_bestEndPointDistance;
    m_bestEndPointDistance = std::numeric_limits<float>::infinity();
    m_bestResultInfo.valid = false;
    if (!testEndPoint(m_bestEndPoint)) {
        m_bestEndPointDistance = prevBestDistance * 1.3f;
    }

    // TODO: sample closer if we are already close
    const int ITERATIONS = 200;
    for (int i = 0;i<ITERATIONS;i++) {
        if (i == ITERATIONS / 3 && !m_bestResultInfo.valid) {
            m_bestEndPointDistance = std::numeric_limits<float>::infinity();
        }
        int randVal = m_rng->uniformInt() % 1024;
        Vector testPoint;
        if (randVal < 300) {
            // sample random point around actual end point
            float testRadius = std::min(m_bestEndPointDistance, 0.3f);
            testPoint = distance + Vector(m_rng->uniformFloat(-testRadius, testRadius), m_rng->uniformFloat(-testRadius, testRadius));
        } else if (randVal < 800 || m_bestEndPointDistance < 0.3f) {
            // sample random point around last best end point
            float testRadius = std::min(m_bestEndPointDistance, 0.3f);
            testPoint = m_bestEndPoint + Vector(m_rng->uniformFloat(-testRadius, testRadius), m_rng->uniformFloat(-testRadius, testRadius));
        } else {
            // sample random point in field
            testPoint = randomPointInField();
        }
        testEndPoint(testPoint);
    }

    if (!m_bestResultInfo.valid) {
        escapeObstacles();
    }
}

std::pair<int, float> TrajectoryPath::trajectoryObstacleScore(const SpeedProfile &speedProfile)
{
    float totalTime = speedProfile.time();
    const float SAMPLING_INTERVAL = 0.005f;
    int samples = int(totalTime / SAMPLING_INTERVAL) + 1;

    int currentBestObstaclePrio = -1;
    float currentBestObstacleTime = 0;
    float minStaticObstacleDistance = std::numeric_limits<float>::max();
    for (int i = 0;i<samples;i++) {
        float time;
        if (i < samples-1) {
            time = i * SAMPLING_INTERVAL;
        } else {
            time = totalTime;
        }

        Vector pos = speedProfile.positionForTime(time) + s0;
        int obstaclePriority = -1;
        if (!pointInPlayfield(pos, m_radius)) {
            obstaclePriority = m_outOfFieldPriority;
        }
        for (const auto obstacle : m_obstacles) {
            if (obstacle->prio > obstaclePriority) {
                float distance = obstacle->distance(pos);
                minStaticObstacleDistance = std::min(minStaticObstacleDistance, distance);
                if (distance < m_radius) {
                    obstaclePriority = obstacle->prio;
                }
            }
        }
        for (const auto &o : m_movingCircles) {
            if (o.prio > obstaclePriority && o.intersects(pos, time)) {
                obstaclePriority = o.prio;
            }
        }
        for (const auto &o : m_movingLines) {
            if (o.prio > obstaclePriority && o.intersects(pos, time)) {
                obstaclePriority = o.prio;
            }
        }
        for (const auto &o : m_friendlyRobotObstacles) {
            if (o.prio > obstaclePriority && o.intersects(pos, time)) {
                obstaclePriority = o.prio;
            }
        }
        if (obstaclePriority > currentBestObstaclePrio) {
            currentBestObstaclePrio = obstaclePriority;
            currentBestObstacleTime = 0;
        }
        if (obstaclePriority == currentBestObstaclePrio) {
            if (i == samples-1) {
                // strong penalization for stopping in an obstacle
                currentBestObstacleTime += 10;
            } else {
                currentBestObstacleTime += SAMPLING_INTERVAL;
            }
        }
    }
    if (currentBestObstaclePrio == -1) {
        return {-1, minStaticObstacleDistance};
    } else {
        return {currentBestObstaclePrio, currentBestObstacleTime};
    }
}

void TrajectoryPath::escapeObstacles()
{
    // try last trajectory
    SpeedProfile p = AlphaTimeTrajectory::calculateTrajectoryExactEndSpeed(v0, Vector(0, 0), m_bestEscapingTime, m_bestEscapingAngle, ACCELERATION, MAX_SPEED);
    auto lastResult = trajectoryObstacleScore(p);
    int bestPrio = lastResult.first;
    float bestObstacleTime = lastResult.second;
    float bestTotalTime = p.time();
    float bestTargetDistance = p.positionForTime(bestTotalTime).distance(distance);

    for (int i = 0;i<100;i++) {
        float time, angle;
        if (m_rng->uniformInt() % 2 == 0) {
            // random sampling
            time = m_rng->uniformFloat(0.4f, 5.0f);
            angle = m_rng->uniformFloat(0, float(2 * M_PI));
        } else {
            // sample around current best point
            time = std::max(0.05f, m_bestEscapingTime + m_rng->uniformFloat(-0.1f, 0.1f));
            angle = m_bestEscapingAngle + m_rng->uniformFloat(-0.1f, 0.1f);
        }
        SpeedProfile p = AlphaTimeTrajectory::calculateTrajectoryExactEndSpeed(v0, Vector(0, 0), time, angle, ACCELERATION, MAX_SPEED);
        if (p.isValid()) {
            auto result = trajectoryObstacleScore(p);
            float trajectoryTime = p.time();
            bool isBestResult = false;
            float targetDistance = p.positionForTime(trajectoryTime).distance(distance);
            if (bestPrio < 0 && result.first < 0) {
                targetDistance += std::min(0.2f, result.second);
                isBestResult = targetDistance < bestTargetDistance;
            } else {
                isBestResult = result.first < bestPrio || (result.first == bestPrio && result.second < bestObstacleTime) ||
                        (result.first == bestPrio && result.second == bestObstacleTime && trajectoryTime < bestTotalTime);
            }
            if (isBestResult) {
                bestPrio = result.first;
                bestObstacleTime = result.second;
                bestTotalTime = trajectoryTime;
                bestTargetDistance = targetDistance;
                m_bestEscapingTime = time;
                m_bestEscapingAngle = angle;
            }
        }
    }

    // the result is the best trajectory found
    m_generationInfo.clear();
    TrajectoryGenerationInfo info;
    info.time = m_bestEscapingTime;
    info.angle = m_bestEscapingAngle;
    info.slowDownTime = 0;
    info.fastEndSpeed = false;
    info.v0 = v0;
    info.v1 = Vector(0, 0);
    info.desiredDistance = Vector(0, 0);
    m_generationInfo.push_back(info);
}

void TrajectoryPath::findPathAlphaT()
{
    collectObstacles();

    // check if start point is in obstacle
    if (isInStaticObstacle(s0) || isInMovingObstacle(s0, 0)) {
        escapeObstacles();
        return;
    }

    // check if end point is in obstacle
    if (isInStaticObstacle(s1)) {
        for (const Obstacle *o : m_obstacles) {
            float dist = o->distance(s1);
            if (dist > 0.01f && dist < m_radius) {
                s1 = o->projectOut(s1, m_radius, 0.03f);
            }
        }
        distance = s1 - s0;
        // test again, might have been moved into another obstacle
        if (isInStaticObstacle(s1)) {
            findPathEndInObstacle();
            return;
        }
    }

    // check direct trajectory
    m_generationInfo.clear();
    float directSlowDownTime = exponentialSlowDown ? TOTAL_SLOW_DOWN_TIME : 0.0f;
    bool useHighPrecision = distance.length() < 0.1f && v1 == Vector(0, 0) && v0.length() < 0.2f;
    SpeedProfile direct = AlphaTimeTrajectory::findTrajectoryFastEndSpeed(v0, v1, distance, ACCELERATION, MAX_SPEED, directSlowDownTime, useHighPrecision);
    if (direct.isValid()) {
        auto obstacleDistances = minObstacleDistance(direct, 0, directSlowDownTime, s0);
        if (obstacleDistances.first > OBSTACLE_AVOIDANCE_RADIUS ||
                (obstacleDistances.second > 0 && obstacleDistances.second < OBSTACLE_AVOIDANCE_RADIUS)) {
            TrajectoryGenerationInfo info;
            info.time = direct.inputTime;
            info.angle = direct.inputAngle;
            info.slowDownTime = directSlowDownTime;
            info.fastEndSpeed = true;
            info.v0 = v0;
            info.v1 = v1;
            info.desiredDistance = distance;
            m_generationInfo.push_back(info);
            return;
        }
    }

    BestTrajectoryInfo lastTrajectoryInfo = m_bestResultInfo;

    m_bestResultInfo.time = std::numeric_limits<float>::infinity();
    m_bestResultInfo.valid = false;

    // check trajectory from last iteration
    if (lastTrajectoryInfo.valid) {
        checkMidPoint(lastTrajectoryInfo.midSpeed, lastTrajectoryInfo.centerTime, lastTrajectoryInfo.angle);
    }

    // normal search
    for (int i = 0;i<100;i++) {
        // three sampling modes:
        // - totally random configuration
        // - around current best trajectory
        // - around last frames best trajectory

        enum SamplingMode { TOTAL_RANDOM, CURRENT_BEST, LAST_BEST };
        SamplingMode mode;
        // TODO: reuse random number
        if (!m_bestResultInfo.valid) {
            if (i < 20 || m_rng->uniformInt() % 2 == 0) {
                mode = LAST_BEST;
            } else {
                mode = TOTAL_RANDOM;
            }
        } else {
            if (m_rng->uniformInt() % 1024 < 150) {
                mode = TOTAL_RANDOM;
            } else if (m_bestResultInfo.time < lastTrajectoryInfo.time + 0.05f) {
                mode = CURRENT_BEST;
            } else {
                mode = m_rng->uniformInt() % 2 == 0 ? CURRENT_BEST : LAST_BEST;
            }
        }

        Vector speed;
        float angle, time;
        if (mode == TOTAL_RANDOM) {
            speed = randomSpeed();
            angle = m_rng->uniformFloat(0, float(2 * M_PI));
            // TODO: adjust max time
            float maxTime = m_bestResultInfo.valid ? std::max(0.01f, m_bestResultInfo.time - 0.1f) : 5.0f;
            // TODO: dont sample invalid times
            time = m_rng->uniformFloat(0, maxTime);
        } else {
            // TODO: wenn etwas gut war weiter in die gleiche richtung gehen
            // TODO: gaussian sampling
            const BestTrajectoryInfo &info = mode == CURRENT_BEST ? m_bestResultInfo : lastTrajectoryInfo;
            const float RADIUS = 0.2f;
            Vector chosenMidSpeed = info.midSpeed;
            while (chosenMidSpeed.lengthSquared() > MAX_SPEED_SQUARED) {
                chosenMidSpeed *= 0.9f;
            }
            do {
                speed = chosenMidSpeed + Vector(m_rng->uniformFloat(-RADIUS, RADIUS), m_rng->uniformFloat(-RADIUS, RADIUS));
            } while (speed.lengthSquared() >= MAX_SPEED_SQUARED);
            angle = info.angle + m_rng->uniformFloat(-0.1f, 0.1f);
            time = info.centerTime + m_rng->uniformFloat(-0.1f, 0.1f);
        }
        checkMidPoint(speed, time, angle);
    }

    if (!m_bestResultInfo.valid) {
        escapeObstacles();
    }
}

std::vector<TrajectoryPath::Point> TrajectoryPath::getResultPath()
{
    std::vector<SpeedProfile> parts;
    float toEndTime = 0;
    for (TrajectoryGenerationInfo info : m_generationInfo) {
        SpeedProfile trajectory;
        if (info.fastEndSpeed) {
            trajectory = AlphaTimeTrajectory::calculateTrajectoryFastEndSpeed(info.v0, info.v1, info.time, info.angle,
                                                                              ACCELERATION, MAX_SPEED);
        } else {
            trajectory = AlphaTimeTrajectory::calculateTrajectoryExactEndSpeed(info.v0, info.v1, info.time, info.angle,
                                                                              ACCELERATION, MAX_SPEED);
        }
        parts.push_back(trajectory);
        float totalTime = info.slowDownTime == 0.0f ? trajectory.time() : trajectory.timeWithSlowDown(info.slowDownTime);
        toEndTime += totalTime;
    }

    std::vector<Point> result;
    Vector startPos = s0;
    float currentTime = 0; // time in a trajectory part
    float currentTotalTime = 0; // time from the beginning
    const int SAMPLES_PER_TRAJECTORY = 40;
    const float samplingInterval = toEndTime / (SAMPLES_PER_TRAJECTORY * m_generationInfo.size());
    for (unsigned int i = 0;i<m_generationInfo.size();i++) {
        SpeedProfile &trajectory = parts[i];
        TrajectoryGenerationInfo &info = m_generationInfo[i];
        float partTime = info.slowDownTime == 0.0f ? trajectory.time() : trajectory.timeWithSlowDown(info.slowDownTime);

        // trajectory positions are not perfect, scale them slightly to reach the desired position perfectly
        float xScale = 1, yScale = 1;
        if (info.desiredDistance != Vector(0, 0)) {
            Vector endPos;
            // avoid floating point problems by using a time after the trajectory end
            if (info.slowDownTime == 0.0f) {
                endPos = trajectory.positionForTime(partTime + 1.0f);
            } else {
                endPos = trajectory.calculateSlowDownPos(info.slowDownTime);
            }
            xScale = info.desiredDistance.x / endPos.x;
            yScale = info.desiredDistance.y / endPos.y;
            xScale = std::min(1.1f, std::max(0.9f, xScale));
            yScale = std::min(1.1f, std::max(0.9f, yScale));
        }

        bool wasAtEndPoint = false;
        while (true) {
            if (currentTime > partTime) {
                if (i < m_generationInfo.size()-1) {
                    currentTime -= partTime;
                    break;
                } else {
                    if (wasAtEndPoint) {
                        break;
                    }
                    wasAtEndPoint = true;
                }
            }
            Point p;
            p.time = currentTotalTime;
            Vector position;
            if (info.slowDownTime == 0.0f) {
                position = trajectory.positionForTime(currentTime);
                p.speed = trajectory.speedForTime(currentTime);
            } else {
                position = trajectory.positionForTimeSlowDown(currentTime, info.slowDownTime);
                p.speed = trajectory.speedForTimeSlowDown(currentTime, info.slowDownTime);
            }
            p.pos = startPos + Vector(position.x * xScale, position.y * yScale);
            result.push_back(p);

            currentTime += samplingInterval;
            currentTotalTime += samplingInterval;
        }
        startPos = result.back().pos;
    }
    m_currentTrajectory = result;
    return result;
}
