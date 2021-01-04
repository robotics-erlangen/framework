/***************************************************************************
 *   Copyright 2015 Michael Eischer, Stefan Friedrich, Jan Kallwies,       *
 *       Philipp Nordhus                                                   *
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

#ifndef COMMAND_EVALUATOR_H
#define COMMAND_EVALUATOR_H

#include "coordinatehelper.h"
#include "protobuf/robot.pb.h"
#include <QtGlobal>

namespace amun { class DebugValues; }
namespace world { class Robot; }

class LocalSpeed;
class GlobalSpeed;

class CommandEvaluator
{
    // no copy of this instance
    Q_DISABLE_COPY(CommandEvaluator)

public:
    explicit CommandEvaluator(const robot::Specs &specs);

public:
    void calculateCommand(const world::Robot *robot, qint64 worldTime, robot::Command &command, amun::DebugValues *debug);
    void setInput(const robot::ControllerInput &input, qint64 currentTime);
    void clearInput();
    bool hasInput();
    qint64 startTime() const{ return m_startTime; }

private:
    static float robotToPhi(const world::Robot *robot);
    GlobalSpeed evaluateInput(bool hasTrackedRobot, float robotPhi, qint64 worldTime, const robot::Command &command, amun::DebugValues *debug, bool drawSplines, bool hasManualCommand);
    LocalSpeed evaluateLocalManualControl(const robot::Command &command);
    GlobalSpeed evaluateManualControl(const robot::Command &command);
    GlobalSpeed evaluateSplineAtTime(const qint64 worldTime);
    int findActiveSpline(const float time);
    GlobalSpeed evaluateSplinePartAtTime(const robot::Spline &spline, const float t);

    void logInvalidCommand(amun::DebugValues *debug, qint64 worldTime);
    void drawSpline(amun::DebugValues *debug);

    void prepareBaseSpeed(const world::Robot *robot, qint64 worldTime);
    void updateBaseSpeed(qint64 worldTime, GlobalSpeed limitedOutput);
    GlobalSpeed limitAcceleration(float robotPhi, const GlobalSpeed &command, const GlobalSpeed &baseSpeed, float timeStep, bool hasManualCommand);
    float boundAcceleration(float acceleration, float oldSpeed, float speedupLimit, float brakeLimit) const;
    void drawSpeed(const world::Robot *robot, const GlobalSpeed &output, amun::DebugValues *debug);

private:
    const robot::Specs m_specs;

    robot::ControllerInput m_input;
    // Time (absolute) when new input arrived, in ns.
    qint64 m_startTime;

    GlobalSpeed m_baseSpeed;
    qint64 m_baseSpeedTime;
};

#endif // COMMAND_EVALUATOR_H
