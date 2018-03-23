/***************************************************************************
 *   Copyright 2017 Michahel Eischer                                       *
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

#include "coordinatehelper.h"
#include "protobuf/robot.pb.h"
#include <cmath>

LocalSpeed::LocalSpeed(float v_s, float v_f, float omega) : v_s(v_s), v_f(v_f), omega(omega) {}

GlobalSpeed LocalSpeed::toGlobal(float phi) const {
    // rotate ccw
    const float v_x = std::cos(phi) * v_s - std::sin(phi) * v_f;
    const float v_y = std::sin(phi) * v_s + std::cos(phi) * v_f;
    return GlobalSpeed(v_x, v_y, omega);
}

void LocalSpeed::copyToSpeedVector(robot::SpeedVector &vector) const {
    vector.set_v_s(v_s);
    vector.set_v_f(v_f);
    vector.set_omega(omega);
}


GlobalSpeed::GlobalSpeed(float v_x, float v_y, float omega) : v_x(v_x), v_y(v_y), omega(omega) {}

LocalSpeed GlobalSpeed::toLocal(float phi) const {
    // rotate cw
    const float v_s = std::cos(-phi) * v_x - std::sin(-phi) * v_y;
    const float v_f = std::sin(-phi) * v_x + std::cos(-phi) * v_y;
    return LocalSpeed(v_s, v_f, omega);
}

bool GlobalSpeed::isValid() const {
    return !std::isnan(v_x) && !std::isinf(v_x) &&
            !std::isnan(v_y) && !std::isinf(v_y) &&
            !std::isnan(omega) && !std::isinf(omega);
}


LocalAcceleration::LocalAcceleration(float a_s, float a_f, float a_phi) : a_s(a_s), a_f(a_f), a_phi(a_phi) {}

GlobalAcceleration LocalAcceleration::toGlobal(float phi) const {
    // rotate ccw
    const float a_x = std::cos(phi) * a_s - std::sin(phi) * a_f;
    const float a_y = std::sin(phi) * a_s + std::cos(phi) * a_f;
    return GlobalAcceleration(a_x, a_y, a_phi);
}


GlobalAcceleration::GlobalAcceleration(float a_x, float a_y, float a_phi) : a_x(a_x), a_y(a_y), a_phi(a_phi) {}

LocalAcceleration GlobalAcceleration::toLocal(float phi) const {
    // rotate cw
    const float a_s = std::cos(-phi) * a_x - std::sin(-phi) * a_y;
    const float a_f = std::sin(-phi) * a_x + std::cos(-phi) * a_y;
    return LocalAcceleration(a_s, a_f, a_phi);
}
