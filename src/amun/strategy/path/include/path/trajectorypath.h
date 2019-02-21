#ifndef TRAJECTORYPATH_H
#define TRAJECTORYPATH_H

#include "abstractpath.h"

class TrajectoryPath : public AbstractPath
{
public:
    TrajectoryPath(uint32_t rng_seed);
    void reset() override;
};

#endif // TRAJECTORYPATH_H
