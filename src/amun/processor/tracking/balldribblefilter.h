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

#ifndef BALLDRIBBLEFILTER_H
#define BALLDRIBBLEFILTER_H

#include "abstractballfilter.h"

class DribbleFilter : public AbstractBallFilter
{
public:
    explicit DribbleFilter(VisionFrame& frame, CameraInfo* cameraInfo);
    DribbleFilter(const DribbleFilter& dribbleFilter, qint32 primaryCamera);

    void processVisionFrame(VisionFrame const& frame) override;
    bool acceptDetection(const VisionFrame& frame) override;
    void writeBallState(world::Ball *ball, qint64 predictionTime) override;

    bool isActive() const { return false; }
};

#endif // BALLDRIBBLEFILTER_H
