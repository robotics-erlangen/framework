#include "trajectorypath.h"

TrajectoryPath::TrajectoryPath(uint32_t rng_seed) :
    AbstractPath(rng_seed)
{

}

void TrajectoryPath::reset()
{

}

std::vector<TrajectoryPath::Point> TrajectoryPath::calculateTrajectory(Vector s0, Vector v0, Vector s1, Vector v1, float maxSpeed)
{
    return std::vector<Point>();
}
