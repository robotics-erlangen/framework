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

#ifndef COORDINATEHELPER_H
#define COORDINATEHELPER_H

class GlobalSpeed;
class GlobalAcceleration;
namespace robot { class SpeedVector; }

class LocalSpeed {
public:
    LocalSpeed(float v_s, float v_f, float omega);
    GlobalSpeed toGlobal(float phi) const;
    void copyToSpeedVector(robot::SpeedVector &vector) const;

    float v_s;
    float v_f;
    float omega;
};

class GlobalSpeed {
public:
    GlobalSpeed(float v_x, float v_y, float omega);
    LocalSpeed toLocal(float phi) const;
    bool isValid() const;

    float v_x;
    float v_y;
    float omega;
};

class LocalAcceleration {
public:
    LocalAcceleration(float a_s, float a_f, float a_phi);
    GlobalAcceleration toGlobal(float phi) const;

    float a_s;
    float a_f;
    float a_phi;
};

class GlobalAcceleration {
public:
    GlobalAcceleration(float a_x, float a_y, float a_phi);
    LocalAcceleration toLocal(float phi) const;

    float a_x;
    float a_y;
    float a_phi;
};

#endif // COORDINATEHELPER_H
