/***************************************************************************
 *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

#include "timer.h"

#include <chrono>
#include <ratio>

/*!
 * \class Timer
 * \ingroup core
 * \brief High precision timer
 */

/*!
 * \brief Creates a new timer object
 */
Timer::Timer()
{
    reset();
}

/*!
 * \brief Sets time scaling. Time is guaranteed to be continuous
 * \param scaling New scaling factor
 */
void Timer::setScaling(double scaling)
{
    Q_ASSERT(scaling >= 0);
    setTime(currentTime(), scaling);
    emit scalingChanged(scaling);
}

/*!
 * \brief Reset timer to current time and reset Scaling
 */
void Timer::reset()
{
    setTime(systemTime(), 1.0);
}

/*!
 * \brief Query internal time
 * \return The internal time in nanoseconds
 */
qint64 Timer::currentTime() const
{
    const qint64 sys = systemTime();
    return m_offset + (qint64)((sys - m_start) * m_scaling);
}

/*!
 * \brief Set internal time and scaling
 * \param time New internal time
 * \param scaling New scaling factor
 */
void Timer::setTime(qint64 time, double scaling)
{
    Q_ASSERT(scaling >= 0);
    m_offset = time;
    m_start = systemTime();
    m_scaling = scaling;
}

/*!
 * \brief Query system time
 * \return The current system time in nanoseconds
 */
qint64 Timer::systemTime()
{
    using namespace std::chrono;
    const auto t = steady_clock::now().time_since_epoch();
    return duration_cast<nanoseconds>(t).count();
}
