/***************************************************************************
 *   Copyright 2016 Alexander Danzer                                       *
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

#ifndef BALLGROUNDFILTER_H
#define BALLGROUNDFILTER_H

#include "abstractballfilter.h"
#include "protobuf/ssl_detection.pb.h"
#include "protobuf/world.pb.h"
#include "protobuf/debug.pb.h"
#include <memory>

class GroundFilter : public AbstractBallFilter
{
public:
    explicit GroundFilter(const VisionFrame &frame, CameraInfo* cameraInfo, const FieldTransform &transform, const world::BallModel &ballModel);
    GroundFilter(const GroundFilter& groundFilter, qint32 primaryCamera);

    void processVisionFrame(const VisionFrame& frame) override;
    void writeBallState(world::Ball *ball, qint64 time, const QVector<RobotInfo> &robots, qint64 lastCameraFrameTime) override;
    // choosing detections is handled by the ballgroundcollisionfilter
    int chooseDetection(const std::vector<VisionFrame>&) const override { return -1; }

    void reset(const VisionFrame& frame);
    float distanceTo(Eigen::Vector2f objPos) const;
    void setObservationStdDev(float deviation);
    void setSpeed(Eigen::Vector2f speed);

private:
    std::unique_ptr<Kalman> m_kalman;
    void predict(qint64 time);
    qint64 m_lastUpdate;
};

#endif // BALLGROUNDFILTER_H
