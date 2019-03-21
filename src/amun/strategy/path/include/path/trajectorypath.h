#ifndef TRAJECTORYPATH_H
#define TRAJECTORYPATH_H

#include "abstractpath.h"
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

    TrajectoryPath(uint32_t rng_seed);
    void reset() override;
    // TODO: acceleration factor
    std::vector<Point> calculateTrajectory(Vector s0, Vector v0, Vector s1, Vector v1, float maxSpeed);
};

#endif // TRAJECTORYPATH_H
