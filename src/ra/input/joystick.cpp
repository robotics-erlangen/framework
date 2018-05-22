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

#include "joystick.h"
#include <QString>
#include <cmath>

int Joystick::m_joystickCounter = 1; // start counting with 1

Joystick *Joystick::open(int deviceId) {
    // only use game controllers
    if (!SDL_IsGameController(deviceId)) {
        return NULL;
    }

    // open game controller
    SDL_GameController *controller = SDL_GameControllerOpen(deviceId);
    if (!controller) {
        QString err = QString("Could not open gamecontroller %1: %2").arg(deviceId).arg(QString(SDL_GetError()));
        qWarning("%s", err.toLatin1().constData());
        return NULL;
    }

    // get joystick id, is used to pass events to the right controller
    SDL_Joystick *joystick = SDL_GameControllerGetJoystick(controller);
    SDL_JoystickID id = SDL_JoystickInstanceID(joystick);

    if (id < 0) {
        QString err = QString("Quering id of gamecontroller %1 failed: %2").arg(deviceId).arg(QString(SDL_GetError()));
        qWarning("%s", err.toLatin1().constData());
        SDL_GameControllerClose(controller);
        return NULL;
    }

    return new Joystick(QString("Gamepad %1").arg(m_joystickCounter++), controller, id);
}

Joystick::Joystick(const QString &name, SDL_GameController *controller, SDL_JoystickID id) :
    InputDevice(name),
    m_controller(controller),
    m_id(id),
    m_deadzone(0.2f)
{ }

Joystick::~Joystick() {
    SDL_GameControllerClose(m_controller);
}

void Joystick::handleEvent(const SDL_Event &event) {
    // distribute events
    switch(event.type) {
    case SDL_CONTROLLERAXISMOTION:
        handleAxis((SDL_GameControllerAxis)event.caxis.axis, event.caxis.value / 32767.0f);
        break;
    case SDL_CONTROLLERBUTTONDOWN:
    case SDL_CONTROLLERBUTTONUP:
        handleButton((SDL_GameControllerButton)event.cbutton.button, event.cbutton.state == SDL_PRESSED);
        break;
    }
}

void Joystick::handleAxis(SDL_GameControllerAxis axis, float value)
{
    value = std::copysign(std::max(0.f, std::abs(value) - m_deadzone) / (1-m_deadzone), value);

    // axis are mapped by sdl
    switch (axis) {
    case SDL_CONTROLLER_AXIS_LEFTX: // sideward
        m_command.set_v_s(value);
        break;

    case SDL_CONTROLLER_AXIS_LEFTY: // forward
        // axis on gamecontrollers is inverted
        m_command.set_v_f(-value);
        break;

    case SDL_CONTROLLER_AXIS_RIGHTX: // rotation
        // angles are conterclockwise
        m_command.set_omega(-value);
        break;

    case SDL_CONTROLLER_AXIS_TRIGGERLEFT:
        m_command.set_dribbler(value); // allow different dribble speeds
        break;

    case SDL_CONTROLLER_AXIS_TRIGGERRIGHT:
        // chip if trigger is half pressed
        if (value > 0.5f) {
            m_command.set_kick_power(1.0f);
            m_command.set_kick_style(robot::Command::Chip);
        } else {
            m_command.set_kick_power(0.0f);
        }
        break;
    default:
        break;
    }
}

void Joystick::handleButton(SDL_GameControllerButton button, bool pressed)
{
    // buttons are mapped by sdl
    switch (button) {
    case SDL_CONTROLLER_BUTTON_LEFTSHOULDER:
        m_command.set_dribbler((pressed) ? 1.0f : 0.0f);
        break;

    case SDL_CONTROLLER_BUTTON_RIGHTSHOULDER:
        m_command.set_kick_power((pressed) ? 1.0f : 0.0f);
        if (pressed) {
            m_command.set_kick_style(robot::Command::Linear);
        }
        break;

    case SDL_CONTROLLER_BUTTON_Y: // button 4 on logitech rumblepad 2
        if (pressed) {
            emit toggleTransceiver();
        }
        break;

    case SDL_CONTROLLER_BUTTON_X: // button 1 on logitech rumblepad 2
        if (pressed) {
            emit sendRefereeCommand(SSL_Referee::HALT);
        }
        break;

    case SDL_CONTROLLER_BUTTON_A: // button 2 on logitech rumblepad 2
        if (pressed) {
            emit sendRefereeCommand(SSL_Referee::STOP);
        }
        break;

    case SDL_CONTROLLER_BUTTON_B: // button 3 on logitech rumblepad 2
        if (pressed) {
            emit sendRefereeCommand(SSL_Referee::FORCE_START);
        }
        break;

    case SDL_CONTROLLER_BUTTON_BACK: // button 9 on logitech rumblepad 2
        if (pressed) {
            emit sendRefereeCommand(SSL_Referee::INDIRECT_FREE_YELLOW);
        }
        break;

    case SDL_CONTROLLER_BUTTON_START: // button 10 on logitech rumblepad 2
        if (pressed) {
            emit sendRefereeCommand(SSL_Referee::INDIRECT_FREE_BLUE);
        }
        break;
    default:
        break;
    }
}

