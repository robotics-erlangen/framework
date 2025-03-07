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

#include "visionprocessingtime.h"

#include "core/timeconversion.h"
#include "protobuf/ssl_detection.pb.h"
#include <QtGlobal>
#include <chrono>
#include <utility>

using namespace std::chrono;
using namespace std::chrono_literals;

std::pair<nanoseconds, const char*> VisionProcessingTime::get(const SSL_DetectionFrame& detectionFrame, qint64 currentTime)
{
    const nanoseconds visionProcessingTime  = fromVisionTime(detectionFrame.t_sent() - detectionFrame.t_capture());

    const char* msg = isVisionProcessingSlow(currentTime, visionProcessingTime)
        ? "<font color=\"red\">WARNING:</font> Multiple vision detection "
          "frames with a high processing time. These may be discarded."
        : nullptr;

    return { visionProcessingTime, msg };
}

bool VisionProcessingTime::isVisionProcessingSlow(qint64 currentTime, nanoseconds visionProcessingTime)
{
    constexpr milliseconds VISION_WARN_TIME = 40ms;
    if (visionProcessingTime >= VISION_WARN_TIME) {
        m_numSlowVisionFrames++;
        m_lastSlowVisionFrame = currentTime;
    }

    /* There may be outliers on the vision computer. We only want to warn
     * if the delay is continously high
     */
    if (m_lastSlowVisionFrame + 10E9 < currentTime) {
        m_numSlowVisionFrames = 0;
    }

    /* There should be around 75 detections per second, warn if one third
     * is bad (25 per second) for around five seconds in a ten second
     * period
     */
    if (m_numSlowVisionFrames > 125) {
        // Reset to avoid log spam
        m_numSlowVisionFrames = 0;

        return true;
    }

    return false;
}
