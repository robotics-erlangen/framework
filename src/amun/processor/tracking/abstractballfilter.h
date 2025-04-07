/***************************************************************************
 *   Copyright 2020 Alexander Danzer, Andreas Wendler                      *
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

#ifndef ABSTRACTBALLFILTER_H
#define ABSTRACTBALLFILTER_H

#include "protobuf/ssl_vision/ssl_detection.pb.h"
#include "protobuf/world.pb.h"
#include "kalmanfilter.h"
#include "robotfilter.h"

#include <QList>
#include <QMap>
#include <QString>
#include <QVector>
#include <chrono>

struct VisionFrame
{
    // rotate position and convert to meter
    VisionFrame(const SSL_DetectionBall& b, qint64 sourceTime, qint32 c, RobotInfo r, std::chrono::nanoseconds vPT, qint64 captureTime)
        : cameraId(c), ballArea(b.area()), x(-b.y()/1000), y(b.x()/1000), sourceTime(sourceTime), captureTime(captureTime),
          robot(r), visionProcessingTime(vPT) {}
    // b.area is optional in the protobuf but defaults to 0, so nothing bad can happen
    qint32 cameraId;
    quint32 ballArea;
    float x;
    float y;
    qint64 sourceTime;
    qint64 captureTime;
    RobotInfo robot;
    std::chrono::nanoseconds visionProcessingTime;
};

struct CameraInfo {
    // index for the map is cameraId
    QMap<int, Eigen::Vector3f> cameraPosition;
    QMap<int, float> focalLength;
};

typedef KalmanFilter<6, 3> Kalman;

class AbstractBallFilter {
public:
    AbstractBallFilter(const AbstractBallFilter&) = default;
    AbstractBallFilter(AbstractBallFilter&&) = delete;
    AbstractBallFilter& operator=(const AbstractBallFilter&) = delete;
    AbstractBallFilter& operator=(AbstractBallFilter&&) = delete;

    virtual void processVisionFrame(VisionFrame const& frame)=0;
    virtual int chooseDetection(const std::vector<VisionFrame>& frames) const =0;
    virtual void writeBallState(world::Ball *ball, qint64 predictionTime, const QVector<RobotInfo> &robots, qint64 lastCameraFrameTime)=0;

    // camera id is necessary for debugging
    void moveToCamera(qint32 primaryCamera) {
        m_primaryCamera = primaryCamera;
    }

protected:
    // initial filter construction
    AbstractBallFilter(const VisionFrame& frame, CameraInfo* cameraInfo, const FieldTransform &transform, const world::BallModel &ballModel) :
        m_cameraInfo(cameraInfo),
        m_primaryCamera(frame.cameraId),
        m_fieldTransform(transform),
        m_ballModel(ballModel)
    {}

    // create a copy of the filter in a different camera for border crossing
    AbstractBallFilter(const AbstractBallFilter& filter, qint32 primaryCamera) :
        m_cameraInfo(filter.m_cameraInfo),
        m_primaryCamera(primaryCamera),
        m_fieldTransform(filter.m_fieldTransform),
        m_ballModel(filter.m_ballModel)
    {}

    virtual ~AbstractBallFilter() {}

    CameraInfo* m_cameraInfo;
    int m_primaryCamera;
    const FieldTransform &m_fieldTransform;
    const world::BallModel &m_ballModel;

};

#endif // ABSTRACTBALLFILTER_H
