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

#ifndef VISIONPROCESSINGTIME_H
#define VISIONPROCESSINGTIME_H

#include <QtGlobal>
#include <chrono>
#include <utility>

class SSL_DetectionFrame;

/*! \brief Calculates the time the vision took to process a frame. Also detects
 * slow vision frames.
 */
class VisionProcessingTime
{
public:
    /*! \brief Calculates the time vision took to process this detectionFrame.
     *
     * If there have been multiple slow vision frames in the recent past, a
     * pointer to a warning message is returned.
     */
    std::pair<std::chrono::nanoseconds, const char*> get(const SSL_DetectionFrame& detectionFrame, qint64 currentTime);

private:
    bool isVisionProcessingSlow(qint64 currentTime, std::chrono::nanoseconds visionProcessingTime);

    /** The last time a slow vision frame was received. Timestamp on a local clock */
    qint64 m_lastSlowVisionFrame = 0;
    /** The number of slow vision frames received in the recent past */
    int m_numSlowVisionFrames = 0;

};

#endif // VISIONPROCESSINGTIME_H
