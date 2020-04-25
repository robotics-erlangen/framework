/***************************************************************************
 *   Copyright 2020 Andreas Wendler                                        *
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

#include "balldribblefilter.h"

DribbleFilter::DribbleFilter(VisionFrame& frame, CameraInfo* cameraInfo) :
    AbstractBallFilter(frame, cameraInfo)
{ }

DribbleFilter::DribbleFilter(const DribbleFilter& dribbleFilter, qint32 primaryCamera) :
    AbstractBallFilter(dribbleFilter, primaryCamera)
{ }

void DribbleFilter::processVisionFrame(VisionFrame const& frame)
{

}

bool DribbleFilter::acceptDetection(const VisionFrame& frame)
{
    return false;
}

void DribbleFilter::writeBallState(world::Ball *ball, qint64 predictionTime)
{

}
