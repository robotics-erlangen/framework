#ifndef TRAJECTORYPATH_H
#define TRAJECTORYPATH_H

#include "abstractpath.h"
#include "alphatimetrajectory.h"
#include "vector.h"
#include <vector>

class TrajectoryPath : public AbstractPath
{
public:
    struct Point
    {
        Vector pos;
        Vector speed;
        float time;
    };

public:
    TrajectoryPath(uint32_t rng_seed);
    void reset() override;
    // TODO: acceleration factor
    std::vector<Point> calculateTrajectory(Vector s0, Vector v0, Vector s1, Vector v1, float maxSpeed);

private:
    bool isInObstacle(Vector point) const;
    bool isTrajectoryInObstacle(const SpeedProfile &profile, float slowDownTime, Vector startPos);
    void findPathAlphaT();
    void removeStartingObstacles();
    void findPathEndInObstacle();
    bool testEndPoint(Vector endPoint);
    bool checkMidPoint(Vector midSpeed, const float time, const float angle, bool debug = false);
    Vector randomSpeed();
    Vector randomPointInField();
    std::vector<Point> getResultPath() const;

private:
    // constant input data
    float minX, maxX, minY, maxY;
    Vector minPoint, maxPoint, fieldSize;

    // frame input data
    Vector v0, v1, distance, s0, s1;
    bool exponentialSlowDown;

    // current best trajectory data
    bool m_lastResultValid = false;
    float m_bestTime = 0;
    float m_bestCenterTime = 0;
    float m_bestAngle = 0;
    Vector m_bestMidSpeed = Vector(0, 0);
    struct TrajectoryGenerationInfo {
        float time;
        float angle;
        float slowDownTime;
        Vector v0;
        Vector v1;
        bool fastEndSpeed;
    };
    std::vector<TrajectoryGenerationInfo> m_generationInfo;
    // for end point in obstacle
    Vector m_bestEndPoint = Vector(0, 0);
    float m_bestEndPointDistance;

    // buffer data
    const int POINT_BUFFER_SIZE = 50;
    Vector pointBuffer[50];

    // quasi constants
    float MAX_SPEED = 3.5f;
    float MAX_SPEED_SQUARED = 9.0f;
    // constants
    const float ACCELERATION = 3.0f;
    const float TOTAL_SLOW_DOWN_TIME = 0.3f; // must be the same as in alphatimetrajectory
};

#endif // TRAJECTORYPATH_H
