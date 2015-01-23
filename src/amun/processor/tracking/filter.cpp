/***************************************************************************
 *   Copyright 2014 Michael Eischer, Philipp Nordhus                       *
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

#include "filter.h"

const qint64 PRIMARY_TIMEOUT = 42*1000*1000; // timeout for switching from primary camera

Filter::Filter(qint64 last_time) :
    m_lastTime(last_time),
    m_lastPrimaryTime(0),
    m_primaryCamera(-1),
    m_frameCounter(0)
{
}

Filter::~Filter()
{
}

// Used for handling of camera overlap. Algorithm:
// Each filter has a primary camera that is used as the main source of vision input.
// The other cameras data are applied with a much higher measurement error covariance.
// This circumvents problems with small calibration errors.
// If two consecutive frames are missing, the primary camera is switched.
// To prevent velocity spikes the model covariance of the position is increased for one step.
bool Filter::checkCamera(quint32 cameraId, qint64 time)
{
    bool cameraSwitched = false;
    // switch to the new camera if the primary camera data is too old
    if (m_lastPrimaryTime + PRIMARY_TIMEOUT < time) {
        // check if the camera was actually switched
        cameraSwitched = (m_primaryCamera != cameraId);
        m_primaryCamera = cameraId;
    }
    if (cameraId == m_primaryCamera) {
        m_lastPrimaryTime = time;
    }
    return cameraSwitched;
}
