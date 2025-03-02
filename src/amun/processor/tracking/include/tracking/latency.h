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

#ifndef TRACKING_LATENCY_H
#define TRACKING_LATENCY_H

#include <chrono>

/*! \brief Estimations for the latencies introduced by different components of
 * the SSL-Vision/Amun/Robot cycle.
 */
namespace latency {
    using namespace std::chrono_literals;

    /*! \brief Half the exposure time for a captured frame.
     *
     * The camera does not capture the entire frame instantaneously; instead,
     * it exposes the sensor for a certain duration. As a result, detections
     * in the image can originate from any point between the shutter opening
     * and closing. Since we cannot determine whether detections correspond
     * to the beginning, middle, or end of this period, we approximate by
     * assuming the middle.
     *
     * \note
     * This value cannot currently be taken from the camera calibration sent
     * over the network. Furthermore, it may vary depending on the camera model
     * and the calibration process, but these differences are hopefully small.
     */
    constexpr auto HALF_EXPOSURE_TIME = 10ms / 2;

    /*! \brief Fallback frame rate for the vision system camera.
     *
     * This value is used when the frame rate cannot be reliably estimated from
     * vision detections. 49.4Hz represents the maximum frame rate of the AVT
     * Guppy F-046C camera, which is utilized in the RoboBasement.
     */
    constexpr float FALLBACK_VISION_CAM_FRAME_RATE = 49.4f;

    /*! \brief Fallback frame time for the vision system camera.
     *
     * The frame time serves as an upper bound for the transmission delay
     * from the camera to the vision system. If the transmission took
     * longer than this duration, images buffered at the camera would begin
     * to accumulate. While it is theoretically possible for the connection
     * between the camera and vision system to act as a buffer, this is
     * unlikely due to the short distance between them.
     *
     * \note
     * A more accurate value for the current setup can be derived from the
     * transmitted detections by calculating the difference between the
     * t_capture_camera fields of successive detections.
     *
     * \see FALLBACK_VISION_CAM_FRAME_RATE
     */
    constexpr std::chrono::microseconds FALLBACK_VISION_CAM_FRAME_TIME {
        static_cast<std::chrono::microseconds::rep>(1000 * 1000 / FALLBACK_VISION_CAM_FRAME_RATE)
    };

    /*! \brief Estimated latency between a detection being sent by the vision
     * system and its reception by Amun.
     *
     * If the clocks of both systems were synchronized, this latency would be
     * the difference between detection.t_sent and the time of arrival at Amun.
     *
     * This primarily estimates network latency but also includes OS overhead
     * on both ends. It is currently approximated by measuring the ping
     * round-trip time in a tournament-like network and dividing it by two.
     * While not highly accurate, the additional latency introduced here is
     * relatively small and errors are acceptable.
     */
    constexpr auto VISION_TO_RA_INPUT = 600us;
}

#endif //TRACKING_LATENCY_H
