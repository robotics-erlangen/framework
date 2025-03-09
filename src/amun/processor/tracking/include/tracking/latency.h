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

    /*! \brief Estimated latency between the start of a processor tick and the
     * resulting command being sent to the transceiver
     *
     * This currently includes the time for the tracking, processor-side
     * controller and radio preparation code. Measured by instrumenting the
     * processor and radio code, and by looking at old logs.
     *
     * \note
     * On average, this latency is actually lower, but we use the 95%
     * percentile.
     */
    constexpr auto PROCESSOR_START_TO_RA_OUTPUT = 1100us;

    /*! \brief Latency between a radio command being sent by Amun and it being
     * fully received by the radio master.
     *
     * This latency can be measured using usbmon, which outputs timestamps for
     * each host controller driver (HCD) event. For each operation (in our case
     * bulk write) the HCD reports both a submission event and a completion
     * event.
     *
     * Comparisons to user-space timestamps can be made by using a timer
     * implementation similar to that of usbmon (by reviewing its source code)
     * and correlating timestamps. This process is relatively straightforward
     * since, for our 100Hz write rate, the sequence of events for output
     * operations always follows:
     *
     * 1. User-space command preparation
     * 2. HCD submission
     * 3. HCD completion
     * 4. Return to user-space
     *
     * The latency corresponds to the 90% percentile of the measured difference
     * between steps 1 and 3.
     *
     * \note
     * Since XHCI (eXtensible Host Controller Interface) supports IOC
     * (Interrupt On Completion), which triggers when a transfer is complete,
     * and the Linux kernel XHCI driver bulk output code includes paths that
     * set this flag, we assume that the completion event is fired once the
     * radio command has been fully transmitted. This assumption has not been
     * verified for older host controller versions, but we expect the same
     * principle to apply.
     *
     * \see https://docs.kernel.org/usb/usbmon.html
     */
    constexpr auto RA_OUTPUT_TO_RADIO_MASTER = 850us;

    /*! \brief Estimated half-latency introduced by the HBC radio master.
     *
     * The HBC radio master operates in 10ms cycles, transmitting the latest
     * radio data it has received from Amun. Since the two systems are not
     * synchronized, the transmitted data may be anywhere from 0 to 10ms old.
     * As an approximation, we assume the middle of this range.
     */
    constexpr auto HBC_MASTER_HALF_LATENCY = 10ms / 2;

    /*! \brief Latency between a radio command being sent to the HBC module
     * on the master side and fully received on the robot side.
     *
     * This latency can be measured using a logic analyzer connected to both
     * the master and the robot. The connected pins should be pulled high at
     * the start and end of the transmission to capture the duration.
     */
    constexpr auto HBC_TRANSMISSION_LATENCY = 2ms;

    /*! \brief Latency between a robot receiving a command and it acting on it
     *
     * This is estimated from the period of the robot's control loops. In
     * particular, the mainboard control loop (either for position or velocity
     * control) has a 2000us period, while the motorboard RPM control loop has
     * a 1000us period. On average, commands take half the period to be acted
     * on.
     *
     * Many other factors are likely to be small enough to allow us to ignore
     * them. For example, the SPI transmission between the mainboard and
     * motorboard should take around 52.8us max for 66 bytes at 10Mbit/s.
     *
     * \note
     * This latency could be measured more accurately by utilizing a logic
     * analyzer.
     */
    constexpr auto ROBOT_INPUT_TO_ACTION_VISIBLE = 2ms;
}

#endif //TRACKING_LATENCY_H
