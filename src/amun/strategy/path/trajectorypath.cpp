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
#include <QDebug>

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

TrajectoryPath::FriendlyRobotObstacle::FriendlyRobotObstacle() :
    bound(Vector(0, 0), Vector(0, 0))
{ }

TrajectoryPath::FriendlyRobotObstacle::FriendlyRobotObstacle(std::vector<Point> *trajectory, float radius, int prio) :
    trajectory(trajectory),
    radius(radius),
    bound(trajectory->at(0).pos, trajectory->at(1).pos)
{
    this->prio = prio;
    timeInterval = trajectory->at(1).time - trajectory->at(0).time;
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
    m_avoidanceLines.clear();
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
    FriendlyRobotObstacle o(obstacle, radius + m_radius, prio);
    m_friendlyRobotObstacles.push_back(o);
}

void TrajectoryPath::addAvoidanceLine(Vector s0, Vector s1, float radius, float avoidanceFactor)
{
    AvoidanceLine line;
    line.segment = LineSegment(s0, s1);
    line.radius = radius;
    line.avoidanceFactor = avoidanceFactor;
    m_avoidanceLines.push_back(line);
}

template<typename container>
bool TrajectoryPath::isInStaticObstacle(const container &obstacles, Vector point) const
{
    if (!pointInPlayfield(point, m_radius)) {
        return true;
    }
    for (const auto obstacle : obstacles) {
        if (obstacle->distance(point) < 0) {
            return true;
        }
    }
    return false;
}

bool TrajectoryPath::isInMovingObstacle(const std::vector<MovingObstacle*> &obstacles, Vector point, float time) const
{
    for (const auto o : obstacles) {
        if (o->intersects(point, time)) {
            return true;
        }
    }
    return false;
}

bool TrajectoryPath::isTrajectoryInObstacle(const SpeedProfile &profile, float timeOffset, float slowDownTime, Vector startPos)
{
    BoundingBox trajectoryBoundingBox = profile.calculateBoundingBox(startPos, 0);
    std::vector<const Obstacle*> intersectingStaticObstacles;
    intersectingStaticObstacles.reserve(m_obstacles.size());
    for (const Obstacle *o : m_obstacles) {
        if (o->boundingBox().intersects(trajectoryBoundingBox)) {
            intersectingStaticObstacles.push_back(o);
        }
    }
    std::vector<MovingObstacle*> intersectingMovingObstacles;
    intersectingMovingObstacles.reserve(m_movingObstacles.size());
    for (MovingObstacle *o : m_movingObstacles) {
        if (o->boundingBox().intersects(trajectoryBoundingBox)) {
            intersectingMovingObstacles.push_back(o);
        }
    }

    float totalTime = slowDownTime > 0 ? profile.timeWithSlowDown(slowDownTime) : profile.time();
    for (int i = 0;i<40;i++) {
        float time = totalTime * i / 39.0f;
        Vector pos = slowDownTime > 0 ? profile.positionForTimeSlowDown(time, slowDownTime) : profile.positionForTime(time);
        if (isInStaticObstacle(intersectingStaticObstacles, pos + startPos)) {
            return true;
        }
        if (isInMovingObstacle(intersectingMovingObstacles, pos + startPos, time + timeOffset)) {
            return true;
        }
    }
    return false;
}

float TrajectoryPath::minObstacleDistance(Vector pos, float time, bool checkStatic)
{
    float minDistance = std::numeric_limits<float>::max();
    // static obstacles
    if (checkStatic) {
        for (const auto obstacle : m_obstacles) {
            float d = obstacle->distance(pos);
            if (d <= 0) {
                return d;
            }
            minDistance = std::min(minDistance, d);
        }
    }
    // moving obstacles
    for (const auto o : m_movingObstacles) {
        float d = o->distance(pos, time);
        if (d <= 0) {
            return d;
        }
        minDistance = std::min(minDistance, d);
    }
    // avoidance obstacles
    for (const auto &l : m_avoidanceLines) {
        float d = std::max(0.01f, l.distance(pos));
        minDistance = std::min(minDistance, d);
    }
    return minDistance;
}

std::pair<float, float> TrajectoryPath::minObstacleDistance(const SpeedProfile &profile, float timeOffset, float slowDownTime, Vector startPos)
{
    float totalTime = slowDownTime > 0 ? profile.timeWithSlowDown(slowDownTime) : profile.time();
    float totalMinDistance = std::numeric_limits<float>::max();
    float lastPointDistance = 0;

    const int DIVISIONS = 40;
    Vector lastPos;
    for (int i = 0;i<DIVISIONS;i++) {
        float time = totalTime * i / float(DIVISIONS);
        Vector pos = slowDownTime > 0 ? profile.positionForTimeSlowDown(time, slowDownTime) : profile.positionForTime(time);
        if (!pointInPlayfield(pos + startPos, m_radius)) {
            return {-1.0f, -1.0f};
        }
        float minDistance = minObstacleDistance(pos + startPos, time + timeOffset, true);
        if (minDistance < 0) {
            return {minDistance, minDistance};
        }

        if (i == DIVISIONS-1) {
            lastPointDistance = minDistance;
            lastPos = pos;
        }
        totalMinDistance = std::min(totalMinDistance, minDistance);
    }

    // try to avoid moving obstacles even when the robot reaches its goal
    if (profile.speedForTime(totalTime * 2.0f) == Vector(0, 0)) {
        const float AFTER_STOP_AVOIDANCE_TIME = 0.5f;
        if (totalTime < AFTER_STOP_AVOIDANCE_TIME) {
            const float AFTER_STOP_INTERVAL = 0.03f;
            for (int i = 0;i<int((AFTER_STOP_AVOIDANCE_TIME - totalTime) * (1.0f / AFTER_STOP_INTERVAL));i++) {
                float t = timeOffset + totalTime + i * AFTER_STOP_INTERVAL;
                float minDistance = minObstacleDistance(lastPos + startPos, t, false);
                if (minDistance < 0) {
                    return {minDistance, minDistance};
                }
                totalMinDistance = std::min(totalMinDistance, minDistance);
            }
        }
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
    if (firstPartTime + secondPartTime > m_bestResultInfo.time) {
        return false;
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
    infoFirstPart.profile = firstPart;
    infoFirstPart.slowDownTime = firstPartSlowDownTime;
    infoFirstPart.fastEndSpeed = false;
    infoFirstPart.desiredDistance = firstPartPosition;
    m_generationInfo.push_back(infoFirstPart);

    TrajectoryGenerationInfo infoSecondPart;
    infoSecondPart.profile = secondPart;
    infoSecondPart.slowDownTime = slowDownTime;
    infoSecondPart.fastEndSpeed = true;
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
    info.profile = direct;
    info.slowDownTime = 0;
    info.fastEndSpeed = false;
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

std::tuple<int, float, float> TrajectoryPath::trajectoryObstacleScore(const SpeedProfile &speedProfile)
{
    const float OUT_OF_OBSTACLE_TIME = 0.1f;
    const float LONG_OUF_OF_OBSTACLE_TIME = 1.5f; // used when the trajectory has not yet intersected any obstacle
    float totalTime = speedProfile.time();
    const float SAMPLING_INTERVAL = 0.03f;
    int samples = int(totalTime / SAMPLING_INTERVAL) + 1;

    int currentBestObstaclePrio = -1;
    float currentBestObstacleTime = 0;
    float minStaticObstacleDistance = std::numeric_limits<float>::max();

    int goodSamples = 0;
    float fineTime = 0;
    int lastObstaclePrio = -1;
    bool foundPointInObstacle = false;
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
                if (distance < 0) {
                    obstaclePriority = obstacle->prio;
                }
            }
        }
        for (const auto o : m_movingObstacles) {
            if (o->prio > obstaclePriority && o->intersects(pos, time)) {
                obstaclePriority = o->prio;
            }
        }
        if (obstaclePriority == -1) {
            goodSamples++;
            float boundaryTime = foundPointInObstacle ? OUT_OF_OBSTACLE_TIME : LONG_OUF_OF_OBSTACLE_TIME;
            if (goodSamples > boundaryTime * (1.0f / SAMPLING_INTERVAL)) {
                fineTime = time;
                break;
            }
        } else {
            foundPointInObstacle = true;
            goodSamples = 0;
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
        lastObstaclePrio = obstaclePriority;
    }
    if (fineTime == 0) {
        fineTime = totalTime;
    }
    if (currentBestObstaclePrio == -1) {
        return std::make_tuple(-1, minStaticObstacleDistance, fineTime);
    } else {
        return std::make_tuple(currentBestObstaclePrio, currentBestObstacleTime, lastObstaclePrio == -1 ? fineTime : -1);
    }
}

void TrajectoryPath::escapeObstacles()
{
    // first stage: find a path that quickly exists all obstacles
    Vector bestStartingSpeed;
    Vector bestStartingEndPos;
    float bestEndTime;
    {
        // try last frames trajectory
        SpeedProfile p = AlphaTimeTrajectory::calculateTrajectoryExactEndSpeed(v0, Vector(0, 0), m_bestEscapingTime, m_bestEscapingAngle, ACCELERATION, MAX_SPEED);
        SpeedProfile bestProfile = p;
        int bestPrio;
        float bestObstacleTime;
        float endTime;
        std::tie(bestPrio, bestObstacleTime, endTime) = trajectoryObstacleScore(p);
        bool foundValid = endTime > 0;
        if (!foundValid || !AlphaTimeTrajectory::isInputValidExactEndSpeed(v0, Vector(0, 0), m_bestEscapingTime, ACCELERATION)) {
            bestPrio = 10000;
            bestObstacleTime = 10000;
        }
        bestEndTime = endTime;
        for (int i = 0;i<25;i++) {
            float time, angle;
            if (m_rng->uniformInt() % 2 == 0) {
                // random sampling
                if (!foundValid) {
                    time = m_rng->uniformFloat(0.2f, 6.0f);
                } else {
                    time = m_rng->uniformFloat(0.2f, 2.0f);
                }
                angle = m_rng->uniformFloat(0, float(2 * M_PI));
            } else {
                // sample around current best point
                time = std::max(0.05f, m_bestEscapingTime + m_rng->uniformFloat(-0.1f, 0.1f));
                angle = m_bestEscapingAngle + m_rng->uniformFloat(-0.1f, 0.1f);
            }
            if (!AlphaTimeTrajectory::isInputValidExactEndSpeed(v0, Vector(0, 0), time, ACCELERATION)) {
                continue;
            }

            p = AlphaTimeTrajectory::calculateTrajectoryExactEndSpeed(v0, Vector(0, 0), time, angle, ACCELERATION, MAX_SPEED);
            if (p.isValid()) {
                int prio;
                float obstacleTime;
                std::tie(prio, obstacleTime, endTime) = trajectoryObstacleScore(p);
                if ((prio < bestPrio || (prio == bestPrio && obstacleTime < bestObstacleTime)) && endTime >= 0) {
                    bestPrio = prio;
                    bestProfile = p;
                    bestObstacleTime = obstacleTime;
                    m_bestEscapingTime = time;
                    m_bestEscapingAngle = angle;
                    bestEndTime = endTime;
                    foundValid = true;
                }
            }
        }
        m_maxIntersectingObstaclePrio = bestPrio;

        m_generationInfo.clear();
        if (!foundValid) {
            return;
        }
        TrajectoryGenerationInfo info;
        bestProfile.limitToTime(bestEndTime);
        info.profile = bestProfile;
        info.slowDownTime = 0;
        info.fastEndSpeed = false;
        info.desiredDistance = Vector(0, 0);
        m_generationInfo.push_back(info);

        bestStartingEndPos = bestProfile.positionForTime(bestProfile.time()) + s0;
        bestStartingSpeed = bestProfile.speedForTime(bestProfile.time());

        if (bestStartingSpeed.length() < 0.01f) {
            // nothing to do, the robot will already standing at a safe location
            return;
        }
    }

    // second stage: try to find a path to stop
    {
        float closestDistance = std::numeric_limits<float>::max();
        SpeedProfile bestProfile, p;
        bool foundResult = false;
        if (AlphaTimeTrajectory::isInputValidExactEndSpeed(bestStartingSpeed, Vector(0, 0), m_bestStoppingTime, ACCELERATION)) {
            p = AlphaTimeTrajectory::calculateTrajectoryExactEndSpeed(bestStartingSpeed, Vector(0, 0), m_bestStoppingTime, m_bestStoppingAngle, ACCELERATION, MAX_SPEED);
            if (p.isValid() && !isTrajectoryInObstacle(p, bestEndTime, 0, bestStartingEndPos)) {
                closestDistance = (p.positionForTime(p.time()) + bestStartingEndPos).distance(s1);
                bestProfile = p;
                foundResult = true;
            }
        }
        for (int i = 0;i<25;i++) {
            float time, angle;
            if (m_rng->uniformInt() % 4 == 0) {
                // random sampling
                time = m_rng->uniformFloat(0.2f, 4.0f);
                angle = m_rng->uniformFloat(0, float(2 * M_PI));
            } else {
                // sample around current best point
                time = std::max(0.05f, m_bestStoppingTime + m_rng->uniformFloat(-0.1f, 0.1f));
                angle = m_bestStoppingAngle + m_rng->uniformFloat(-0.1f, 0.1f);
            }
            if (!AlphaTimeTrajectory::isInputValidExactEndSpeed(bestStartingSpeed, Vector(0, 0), time, ACCELERATION)) {
                continue;
            }

            p = AlphaTimeTrajectory::calculateTrajectoryExactEndSpeed(bestStartingSpeed, Vector(0, 0), time, angle, ACCELERATION, MAX_SPEED);
            if (p.isValid() && !isTrajectoryInObstacle(p, bestEndTime, 0, bestStartingEndPos)) {
                Vector stopPos = p.positionForTime(p.time()) + bestStartingEndPos;
                if (stopPos.distance(s1) < closestDistance - 0.05f) {
                    m_bestStoppingTime = time;
                    m_bestStoppingAngle = angle;
                    bestProfile = p;
                    foundResult = true;
                    closestDistance = stopPos.distance(s1);
                }
            }
        }

        if (!foundResult) {
            return;
        }

        TrajectoryGenerationInfo info;
        info.profile = bestProfile;
        info.slowDownTime = 0;
        info.fastEndSpeed = false;
        info.desiredDistance = Vector(0, 0);
        m_generationInfo.push_back(info);
    }
}

void TrajectoryPath::findPathAlphaT()
{
    m_maxIntersectingObstaclePrio = -1;

    for (Circle &c: m_circleObstacles) { c.radius += m_radius; }
    for (Rect &r: m_rectObstacles) { r.radius += m_radius; }
    for (Triangle &t: m_triangleObstacles) { t.radius += m_radius; }
    for (Line &l: m_lineObstacles) { l.radius += m_radius; }
    collectObstacles();
    m_movingObstacles.clear();
    for (auto &o : m_movingCircles) {
        m_movingObstacles.push_back(&o);
    }
    for (auto &o : m_movingLines) {
        m_movingObstacles.push_back(&o);
    }
    for (auto &o : m_friendlyRobotObstacles) {
        m_movingObstacles.push_back(&o);
    }

    // check if start point is in obstacle
    if (isInStaticObstacle(m_obstacles, s0) || isInMovingObstacle(m_movingObstacles, s0, 0)) {
        escapeObstacles();
        return;
    }

    // check if end point is in obstacle
    if (isInStaticObstacle(m_obstacles, s1)) {
        for (const Obstacle *o : m_obstacles) {
            float dist = o->distance(s1);
            if (dist > 0.01f && dist < 0) {
                s1 = o->projectOut(s1, 0.03f);
            }
        }
        distance = s1 - s0;
        // test again, might have been moved into another obstacle
        if (isInStaticObstacle(m_obstacles, s1)) {
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
            info.profile = direct;
            info.slowDownTime = directSlowDownTime;
            info.fastEndSpeed = true;
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
        findPathEndInObstacle();
    }
}

std::vector<TrajectoryPath::Point> TrajectoryPath::getResultPath()
{
    std::vector<SpeedProfile> parts;
    if (m_generationInfo.size() == 0) {
        Point p1;
        p1.pos = s0;
        p1.time = 0;
        p1.speed = v0;
        Point p2;
        p2.pos = s0;
        p2.time = std::numeric_limits<float>::max();
        p2.speed = Vector(0, 0);
        return {p1, p2};
    }

    float toEndTime = 0;
    for (TrajectoryGenerationInfo info : m_generationInfo) {
        float totalTime = info.slowDownTime == 0.0f ? info.profile.time() : info.profile.timeWithSlowDown(info.slowDownTime);
        toEndTime += totalTime;
    }

    std::vector<Point> result;
    Vector startPos = s0;
    float currentTime = 0; // time in a trajectory part
    float currentTotalTime = 0; // time from the beginning
    const int SAMPLES_PER_TRAJECTORY = 40;
    const float samplingInterval = toEndTime / (SAMPLES_PER_TRAJECTORY * m_generationInfo.size());
    for (unsigned int i = 0;i<m_generationInfo.size();i++) {
        TrajectoryGenerationInfo &info = m_generationInfo[i];
        SpeedProfile &trajectory = info.profile;
        float partTime = info.slowDownTime == 0.0f ? trajectory.time() : trajectory.timeWithSlowDown(info.slowDownTime);

        if (partTime > 20 || std::isinf(partTime) || std::isnan(partTime) || partTime < 0) {
            qDebug() <<"Error: trying to use invalid trajectory";
            return result;
        }

        // trajectory positions are not perfect, scale them slightly to reach the desired position perfectly
        float xScale = 1, yScale = 1;
        Vector endPos;
        if (info.slowDownTime == 0.0f) {
            endPos = trajectory.positionForTime(partTime);
        } else {
            endPos = trajectory.calculateSlowDownPos(info.slowDownTime);
        }
        if (info.desiredDistance != Vector(0, 0)) {
            xScale = info.desiredDistance.x / endPos.x;
            yScale = info.desiredDistance.y / endPos.y;
            xScale = std::min(1.1f, std::max(0.9f, xScale));
            yScale = std::min(1.1f, std::max(0.9f, yScale));
            endPos.x *= xScale;
            endPos.y *= yScale;
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
        startPos += endPos;
    }
    m_currentTrajectory = result;
    return result;
}
