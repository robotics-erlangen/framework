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

#ifndef JOYSTICK_H
#define JOYSTICK_H

#include "inputdevice.h"
#include <SDL_events.h>
#include <SDL_gamecontroller.h>
#include <SDL_joystick.h>

class QString;

class Joystick : public InputDevice
{
public:
    static Joystick *open(int deviceId);

    ~Joystick() override;
    SDL_JoystickID getId() const { return m_id; }

    void handleEvent(const SDL_Event &event) ;
    void setDeadzone(float deadzone) { m_deadzone = deadzone; }
private:
    Joystick(const QString &name, SDL_GameController *controller, SDL_JoystickID id);

    void handleAxis(SDL_GameControllerAxis axis, float value);
    void handleButton(SDL_GameControllerButton button, bool pressed);

private:
    static int m_joystickCounter;

    SDL_GameController *m_controller;
    const SDL_JoystickID m_id;

    float m_deadzone;
};

#endif // JOYSTICK_H
