/***************************************************************************
 *   Copyright 2021 Andreas Wendler                                       *
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
#include "ballgroundcollisionfilter.h"

BallGroundCollisionFilter::BallGroundCollisionFilter(const VisionFrame &frame, CameraInfo* cameraInfo) :
    AbstractBallFilter(frame, cameraInfo),
    m_groundFilter(frame, cameraInfo),
    m_pastFilter(frame, cameraInfo)
{

}

BallGroundCollisionFilter::BallGroundCollisionFilter(const BallGroundCollisionFilter& filter, qint32 primaryCamera) :
    AbstractBallFilter(filter, primaryCamera),
    m_groundFilter(filter.m_groundFilter, primaryCamera),
    m_pastFilter(filter.m_pastFilter, primaryCamera)
{

}

void BallGroundCollisionFilter::processVisionFrame(const VisionFrame& frame)
{
    m_lastVisionTime = frame.time;
    m_groundFilter.processVisionFrame(frame);
    m_pastFilter.processVisionFrame(frame);
}

bool BallGroundCollisionFilter::acceptDetection(const VisionFrame& frame)
{
    return m_groundFilter.acceptDetection(frame);
}

void BallGroundCollisionFilter::writeBallState(world::Ball *ball, qint64 time, const QVector<RobotInfo> &robots)
{
    m_groundFilter.writeBallState(ball, time, robots);

    world::Ball pastState;
    m_pastFilter.writeBallState(&pastState, m_lastVisionTime, robots);

    debugCircle("past ball state", pastState.p_x(), pastState.p_y(), 0.015);
}

std::size_t BallGroundCollisionFilter::chooseBall(const std::vector<VisionFrame> &frames)
{
    return m_groundFilter.chooseBall(frames);
}
