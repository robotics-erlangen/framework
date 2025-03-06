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

#ifndef VISIONFRAMETIME_H
#define VISIONFRAMETIME_H

#include "latency.h"

#include "core/percamera.h"
#include <chrono>
#include <optional>

class SSL_DetectionFrame;

/*! \brief Estimates the frame time of the vision camera.
 *
 * The frame time is the time between two consecutive frames of the vision
 * camera (*not* the vision software).
 *
 * The frame time serves as an upper bound for the transmission delay
 * from the camera to the vision system. If the transmission took
 * longer than this duration, images buffered at the camera would begin
 * to accumulate. While it is theoretically possible for the connection
 * between the camera and vision system to act as a buffer, this is
 * unlikely due to the short distance between them.
 */
class VisionFrameTime
{
public:
    /*! \brief Updates the estimator with a new detection frame.
     *
     * \param detectionFrame The detection frame to update the estimator with.
     */
    void update(const SSL_DetectionFrame& detectionFrame);

    /*! \brief Returns the estimated frame time of the vision camera.
     *
     * \param camera_id The ID of the camera to get the estimate for.
     * \return The estimated frame time of the given vision camera.
     */
    std::chrono::nanoseconds get(uint32_t camera_id) const
    {
        return m_data[camera_id].estimate;
    }

private:
    struct Data {
        std::chrono::nanoseconds estimate = latency::FALLBACK_VISION_CAM_FRAME_TIME;

        /*! \brief Last received t_capture_camera value.
         *
         * Initialize to 0 so that the first received value is filtered out through
         * improbability filtering (which is what we want, since
         * m_lastTCaptureCamera is not yet initialized)
         */
        std::chrono::nanoseconds lastTCaptureCamera { 0 };
    };

    PerCamera<Data> m_data;
};

#endif // VISIONFRAMETIME_H
