#ifndef BALLCOLLISIONFILTER_H
#define BALLCOLLISIONFILTER_H

#include "abstractballfilter.h"

class CollisionFilter : public AbstractBallFilter
{
public:
    explicit CollisionFilter(VisionFrame& frame, CameraInfo* cameraInfo);
    ~CollisionFilter() override;
};

#endif // BALLCOLLISIONFILTER_H
