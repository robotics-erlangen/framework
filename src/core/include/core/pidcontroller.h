/***************************************************************************
 *   Copyright 2026 Christoph Schmidtmeier                                 *
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

#ifndef PID_CONTROLLER_H
#define PID_CONTROLLER_H

#include <optional>

template<typename T>
class PIDController {
private:
    float p;
    float i;
    float d;
    std::optional<T> errorIntegral{};
    std::optional<T> prevError{};

public:
    PIDController(const float p, const float i, const float d)
        : p(p), i(i), d(d) {}

    void reset() {
        errorIntegral.reset();
        prevError.reset();
    }

    /**
     * Update the PID and output the control command.
     *
     * timeDiff in seconds
     */
    T update(const T error, const float timeDiff) {
        const T pPart = error * p;

        if (errorIntegral.has_value()) {
            errorIntegral.value() += error * timeDiff;
        } else {
            errorIntegral = error * timeDiff;
        }
        const T iPart = errorIntegral.value() * i;

        const T errorDerivative = (error - prevError.value_or(error)) / timeDiff;
        const T dPart = errorDerivative * d;
        prevError = error;

        return pPart + iPart + dPart;
    }
};

#endif /* PID_CONTROLLER_H */
