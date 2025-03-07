/****************************************************************************
 *   Copyright 2025 Paul Bergmann                                           *
 *   Robotics Erlangen e.V.                                                 *
 *   http://www.robotics-erlangen.de/                                       *
 *   info@robotics-erlangen.de                                              *
 *                                                                          *
 *   This program is free software: you can redistribute it and/or modify   *
 *   it under the terms of the GNU General Public License as published by   *
 *   the Free Software Foundation, either version 3 of the License, or      *
 *   any later version.                                                     *
 *                                                                          *
 *   This program is distributed in the hope that it will be useful,        *
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of         *
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the          *
 *   GNU General Public License for more details.                           *
 *                                                                          *
 *   You should have received a copy of the GNU General Public License      *
 *   along with this program.  If not, see <http://www.gnu.org/licenses/>.  *
 ***************************************************************************/

#ifndef CORE_TIMECONVERSION_H
#define CORE_TIMECONVERSION_H

#include <chrono>

/*! \brief Convert from the given vision time (in seconds) to a
 * std::chrono::nanoseconds object
 */
constexpr std::chrono::nanoseconds fromVisionTime(double t) {
    return std::chrono::nanoseconds {
        static_cast<std::chrono::nanoseconds::rep>(t * 1e9)
    };
}

constexpr double toVisionTime(std::chrono::nanoseconds t) {
    return static_cast<double>(t.count()) / 1e9;
}

#endif // CORE_TIMECONVERSION_H
