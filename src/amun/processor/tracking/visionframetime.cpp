/***************************************************************************
 *   Copyright 2025 Paul Bergmann                                          *
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

#include "visionframetime.h"

#include "core/timeconversion.h"
#include "protobuf/ssl_detection.pb.h"

using namespace std::chrono;
using namespace std::chrono_literals;

void VisionFrameTime::update(const SSL_DetectionFrame &detectionFrame)
{
    if (!detectionFrame.has_t_capture_camera()) {
        return;
    }

    const nanoseconds t_capture_camera = fromVisionTime(detectionFrame.t_capture_camera());

    auto& data = m_data[detectionFrame];

    const nanoseconds delta = t_capture_camera - data.lastTCaptureCamera;
    data.lastTCaptureCamera = t_capture_camera;

    // Apply improbability filtering
    //
    // Under normal circumstances, the frame time is almost constant. This
    // filters out the occasional frame drop.
    if (delta <= 0ms || delta > 1.5 * data.estimate) {
        return;
    }

    data.estimate = delta;
}
