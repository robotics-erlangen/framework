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

bool TrajectoryPath::MovingCircle::intersects(Vector pos, float time) const
{
    if (time >= startTime && time <= endTime) {
        return false;
    }
    Vector centerAtTime = startPos + speed * time;
    return centerAtTime.distanceSq(pos) < radius * radius;
}

bool TrajectoryPath::MovingCircle::intersectsAtAnyTime(Vector pos) const
{
    return LineSegment(startPos, startPos + speed * (endTime - startTime)).distance(pos) < radius;
}


TrajectoryPath::TrajectoryPath(uint32_t rng_seed) :
    AbstractPath(rng_seed)
{

}

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
}

void TrajectoryPath::addMovingCircle(Vector startPos, Vector speed, float startTime, float endTime, float radius)
{
    MovingCircle m;
    m.startPos = startPos;
    m.speed = speed;
    m.startTime = startTime;
    m.endTime = endTime;
    m.radius = radius + m_radius;
    m_movingCircles.push_back(m);
}

bool TrajectoryPath::isInStaticObstacle(Vector point) const
{
    if (!pointInPlayfield(point, m_radius)) {
        return true;
    }
    for (const auto &obstacle : m_obstacles) {
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

bool TrajectoryPath::checkMidPoint(Vector midSpeed, const float time, const float angle, bool debug)
{
    // construct second part from mid point data
    if (!AlphaTimeTrajectory::isInputValidFastEndSpeed(midSpeed, v1, time, ACCELERATION)) {
        if (debug) qDebug() <<"Out 0";
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
    //drawFunction(distance - secondPartOffset);
    if (secondPartTime > m_bestTime) {
        if (debug) qDebug() <<"Out 1";
        return false;
    }

    // calculate first part trajectory
    Vector firstPartPosition = distance - secondPartOffset;
    float firstPartSlowDownTime = exponentialSlowDown ? std::max(0.0f, TOTAL_SLOW_DOWN_TIME - secondPartTime) : 0.0f;
    SpeedProfile firstPart = AlphaTimeTrajectory::findTrajectoryExactEndSpeed(v0, midSpeed, firstPartPosition, ACCELERATION, MAX_SPEED, firstPartSlowDownTime);
    if (!firstPart.isValid()) {
        if (debug) qDebug() <<"Out 3"<<v0.x<<v0.y<<midSpeed.x<<midSpeed.y<<firstPartPosition.x<<firstPartPosition.y<<ACCELERATION<<MAX_SPEED<<firstPartSlowDownTime;
        return false;
    }
    float firstPartTime;
    if (exponentialSlowDown && firstPartSlowDownTime > 0) {
        firstPartTime = firstPart.timeWithSlowDown(firstPartSlowDownTime);
    } else {
        firstPartTime = firstPart.time();
    }
    //qDebug() <<"test: "<<firstPartTime + secondPartTime;
    if (firstPartTime + secondPartTime > m_bestTime) {
        if (debug) qDebug() <<"Out 4";
        return false;
    }
    if (isTrajectoryInObstacle(firstPart, 0, firstPartSlowDownTime, s0)) {
        if (debug) qDebug() <<"Out 5";
        return false;
    }
    // TODO: calculate the offset while calculating the trajectory
    if (isTrajectoryInObstacle(secondPart, firstPartTime, slowDownTime, s1 - secondPartOffset)) {
        if (debug) qDebug() <<"Out 2";
        return false;
    }

    // trajectory is possible, better than previous trajectory
    m_bestTime = firstPartTime + secondPartTime;
    m_bestCenterTime = time;
    m_bestAngle = angle;
    m_bestMidSpeed = midSpeed;
    m_lastResultValid = true;

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
    infoSecondPart.desiredDistance = Vector(0, 0); // do not use desired distance calculation
    m_generationInfo.push_back(infoSecondPart);
    return true;
}

static float random(float min, float max)
{
    float range = max - min;
    return min + float(rand()) * range / RAND_MAX;
}

Vector TrajectoryPath::randomPointInField()
{
    return Vector(random(minX, fieldSize.x), random(minY, fieldSize.y));
}

Vector TrajectoryPath::randomSpeed()
{
    Vector testSpeed;
    do {
        testSpeed.x = random(-MAX_SPEED, MAX_SPEED);
        testSpeed.y = random(-MAX_SPEED, MAX_SPEED);
    } while (testSpeed.lengthSquared() > MAX_SPEED_SQUARED);
    return testSpeed;
}

bool TrajectoryPath::testEndPoint(Vector endPoint)
{
    if (endPoint.distance(distance) > m_bestEndPointDistance) {
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
    m_lastResultValid = true;
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
    m_lastResultValid = false;
    if (!testEndPoint(m_bestEndPoint)) {
        m_bestEndPointDistance = prevBestDistance * 1.3f;
    }

    const int ITERATIONS = 200;
    for (int i = 0;i<ITERATIONS;i++) {
        if (i == ITERATIONS / 3 && !m_lastResultValid) {
            m_bestEndPointDistance = std::numeric_limits<float>::infinity();
        }
        int randVal = rand() % 1024;
        Vector testPoint;
        if (randVal < 300) {
            // sample random point around actual end point
            float testRadius = 0.3f;
            testPoint = distance + Vector(random(-testRadius, testRadius), random(-testRadius, testRadius));
        } else if (randVal < 800) {
            // sample random point around last best end point
            float testRadius = 0.3f;
            testPoint = m_bestEndPoint + Vector(random(-testRadius, testRadius), random(-testRadius, testRadius));
        } else {
            // sample random point in field
            testPoint = randomPointInField();
        }
        testEndPoint(testPoint);
    }
}

void TrajectoryPath::removeStartingObstacles()
{
    std::remove_if(m_obstacles.begin(), m_obstacles.end(), [&](const Obstacle *o) {
        return o->distance(s0) < m_radius;
    });
    std::remove_if(m_movingCircles.begin(), m_movingCircles.end(), [&](const MovingCircle &o) {
        return o.intersects(s0, 0);
    });
}

void TrajectoryPath::findPathAlphaT()
{
    collectObstacles();

    // check direct trajectory
    m_generationInfo.clear();
    float directSlowDownTime = exponentialSlowDown ? TOTAL_SLOW_DOWN_TIME : 0.0f;
    bool useHighPrecision = distance.length() < 0.1f && v1 == Vector(0, 0) && v0.length() < 0.2f;
    SpeedProfile direct = AlphaTimeTrajectory::findTrajectoryFastEndSpeed(v0, v1, distance, ACCELERATION, MAX_SPEED, directSlowDownTime, useHighPrecision);
    if (direct.isValid() && !isTrajectoryInObstacle(direct, 0, directSlowDownTime, s0)) {
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

    float prevBestTime = m_bestTime;
    m_bestTime = std::numeric_limits<float>::infinity();

    // check trajectory from last iteration
    if (m_lastResultValid && !checkMidPoint(m_bestMidSpeed, m_bestCenterTime, m_bestAngle, false)) {
        m_lastResultValid = false;
        // TODO: mal statt +??
        m_bestTime = prevBestTime + 0.2f;
        //qDebug() <<"Last invalid";
    }

    // check if start point is in obstacle
    if (isInStaticObstacle(s0) || isInMovingObstacle(s0, 0)) {
        removeStartingObstacles();
    }

    // check if end point is in obstacle
    if (isInStaticObstacle(s1)) {
        findPathEndInObstacle();
        return;
    }

    // normal search
    for (int i = 0;i<100;i++) {
        if (i == 30 && !m_lastResultValid) {
            m_bestTime = std::numeric_limits<float>::infinity();
        }
        Vector speed;
        float angle, time;
        if (i > 25 && rand() % 1024 < 300) {
            speed = randomSpeed();
            angle = random(0, float(2 * M_PI));
            // TODO: adjust max time
            float maxTime = m_lastResultValid ? std::max(0.01f, m_bestTime - 0.1f) : 5.0f;
            // TODO: dont sample invalid times
            time = random(0, maxTime);
        } else {
            // TODO: gaussian sampling
            const float RADIUS = 0.2f;
            while (m_bestMidSpeed.lengthSquared() > MAX_SPEED_SQUARED) {
                m_bestMidSpeed *= 0.9f;
            }
            do {
                speed = m_bestMidSpeed + Vector(random(-RADIUS, RADIUS), random(-RADIUS, RADIUS));
            } while (speed.lengthSquared() > MAX_SPEED_SQUARED);
            angle = m_bestAngle + random(-0.1f, 0.1f);
            time = m_bestCenterTime + random(-0.1f, 0.1f);
        }
        checkMidPoint(speed, time, angle);
    }
}

std::vector<TrajectoryPath::Point> TrajectoryPath::getResultPath() const
{
    std::vector<Point> result;
    Vector startPos = s0;
    float timeSum = 0;
    for (TrajectoryGenerationInfo info : m_generationInfo) {
        SpeedProfile trajectory;
        if (info.fastEndSpeed) {
            trajectory = AlphaTimeTrajectory::calculateTrajectoryFastEndSpeed(info.v0, info.v1, info.time, info.angle,
                                                                              ACCELERATION, MAX_SPEED);
        } else {
            trajectory = AlphaTimeTrajectory::calculateTrajectoryExactEndSpeed(info.v0, info.v1, info.time, info.angle,
                                                                              ACCELERATION, MAX_SPEED);
        }
        float totalTime = info.slowDownTime == 0.0f ? trajectory.time() : trajectory.timeWithSlowDown(info.slowDownTime);

        // trajectory positions are not perfect, scale them slightly to reach the desired position perfectly
        float xScale = 1, yScale = 1;
        if (info.desiredDistance != Vector(0, 0)) {
            Vector endPos;
            // avoid floating point problems by using a time after the trajectory end
            if (info.slowDownTime == 0.0f) {
                endPos = trajectory.positionForTime(totalTime + 1.0f);
            } else {
                endPos = trajectory.calculateSlowDownPos(info.slowDownTime);
            }
            xScale = info.desiredDistance.x / endPos.x;
            yScale = info.desiredDistance.y / endPos.y;
            xScale = std::min(1.1f, std::max(0.9f, xScale));
            yScale = std::min(1.1f, std::max(0.9f, yScale));
        }
        for (int i = 0;i<40;i++) {
            float t = totalTime * i / 39.0f;
            Point p;
            p.time = timeSum + t;
            Vector position;
            if (info.slowDownTime == 0.0f) {
                position = trajectory.positionForTime(t);
                p.speed = trajectory.speedForTime(t);
            } else {
                position = trajectory.positionForTimeSlowDown(t, info.slowDownTime);
                p.speed = trajectory.speedForTimeSlowDown(t, info.slowDownTime);
            }
            p.pos = startPos + Vector(position.x * xScale, position.y * yScale);
            result.push_back(p);
        }
        startPos = result.back().pos;
        timeSum = result.back().time;
    }
    return result;
}
