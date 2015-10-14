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

#include "inputmanager.h"
#include "keyboard.h"
#include "protobuf/command.pb.h"
#include <QMutableMapIterator>
#include <QTimer>
#include <QtGlobal>
#include <cmath>

#ifdef SDL2_FOUND
#define SDL_MAIN_HANDLED
#include <SDL.h>
#include "joystick.h"
#include <SDL_events.h>
#include <SDL_joystick.h>
#endif // SDL2_FOUND

InputManager::InputManager(QObject *parent) :
    QObject(parent),
    m_maxSpeed(1.0f),
    m_maxOmega(1.0f),
    m_dribblerPower(1.0f),
    m_shootPower(10.0f),
    m_enabled(false),
    m_direct(true)
{
    // add default keyboard
    addDevice(new Keyboard);

#ifdef SDL2_FOUND
    // initialize sdl
    SDL_SetMainReady();
    if (SDL_Init(SDL_INIT_GAMECONTROLLER | SDL_INIT_EVENTS | SDL_INIT_NOPARACHUTE) != 0) {
        qFatal("sdl initialization failed");
    }
    if (SDL_GameControllerAddMappingsFromFile((QString(ERFORCE_DATADIR) + "/gamecontrollerdb.txt").toLatin1()) == -1) {
        qWarning("Failed to load the game controller db");
        qWarning("%s", SDL_GetError());
    }
    // gamepads are added by initial events
#endif // SDL2_FOUND

    // trigger updates with processor frequency
    // must run in gui thread!!!
    QTimer *timer = new QTimer(this);
    connect(timer, SIGNAL(timeout()), SLOT(update()));
    timer->start(10);
}

InputManager::~InputManager()
{
    qDeleteAll(m_devices);
#ifdef SDL2_FOUND
    SDL_Quit(); // shutdown sdl
#endif // SDL2_FOUND
}

void InputManager::update()
{
#ifdef SDL2_FOUND
    // handle sdl events
    SDL_Event event;
    while (SDL_PollEvent(&event)) {
        Joystick* joystick;
        switch(event.type) {
        case SDL_JOYDEVICEADDED: // strange SDL bug?
        case SDL_CONTROLLERDEVICEADDED:
            openJoystick(event.cdevice.which);
            break;
        case SDL_CONTROLLERDEVICEREMOVED:
            closeJoystick((SDL_JoystickID)event.cdevice.which);
            break;
        case SDL_CONTROLLERAXISMOTION: // match event to joystick
            joystick = m_joysticks.value((SDL_JoystickID)event.caxis.which, NULL);
            if (joystick != NULL) {
                joystick->handleEvent(event);
            }
            break;
        case SDL_CONTROLLERBUTTONDOWN: // match event to joystick
        case SDL_CONTROLLERBUTTONUP:
            joystick = m_joysticks.value((SDL_JoystickID)event.cbutton.which, NULL);
            if (joystick != NULL) {
                joystick->handleEvent(event);
            }
            break;
        }
    }
#endif // SDL2_FOUND

    Command command(new amun::Command);
    amun::CommandControl *control = command->mutable_control();

    // only send if enabled
    if (m_enabled) {
        for(BindingsMap::const_iterator it = m_bindings.begin();
                it != m_bindings.end(); ++it) {
            robot::RadioCommand *radio_command = control->add_commands();
            radio_command->set_generation(it.key().first);
            radio_command->set_id(it.key().second);

            robot::Command *command = radio_command->mutable_command();
            command->CopyFrom(it.value()->command());
            // scale speed
            float normalize = 1; // normalize speed, if too fast
            float speedSquare = command->v_s() * command->v_s() + command->v_f() * command->v_f();
            if (speedSquare > 1) {
                normalize = 1 / std::sqrt(speedSquare);
            }
            command->set_v_s(command->v_s() * m_maxSpeed * normalize);
            command->set_v_f(command->v_f() * m_maxSpeed * normalize);
            command->set_omega(command->omega() * m_maxOmega * 2.0 * M_PI);
            command->set_dribbler(command->dribbler() * m_dribblerPower);
            command->set_kick_power(command->kick_power() * m_shootPower);
        }
        for(NetworkControlMap::const_iterator it = m_networkControl.begin();
                it != m_networkControl.end(); ++it) {
            robot::RadioCommand *radio_command = control->add_commands();
            radio_command->set_generation(it.key().first);
            radio_command->set_id(it.key().second);
            radio_command->mutable_command()->set_network_controlled(it.value());
        }
    }

    emit sendCommand(command);
}

void InputManager::addDevice(InputDevice *device) {
    device->setDirect(m_direct); // pass setting
    // connect signals for forwarding
    connect(device, SIGNAL(sendRefereeCommand(SSL_Referee::Command)),
            SIGNAL(sendRefereeCommand(SSL_Referee::Command)));
    connect(device, SIGNAL(toggleTransceiver()), SIGNAL(toggleTransceiver()));

    // add to devices and publish
    m_devices.insert(device->name(), device);
    emit devicesUpdated();
}

void InputManager::removeDevice(InputDevice *device) { // device must be delete manually!
    m_devices.remove(device->name()); // remove from device list
    // remove no longer valid bindings
    QMutableMapIterator<QPair<uint, uint>, InputDevice*> it(m_bindings);
    while (it.hasNext()) {
         it.next();
         if (it.value() == device) {
             it.remove();
         }
     }
    emit devicesUpdated(); // broadcast removal
}


#ifdef SDL2_FOUND
Joystick *InputManager::openJoystick(int deviceId) {
    // open with joystick factory
    Joystick *joystick = Joystick::open(deviceId);
    if (joystick == NULL) {
        return NULL;
    }

    if (m_joysticks.contains(joystick->getId())) {
        return joystick; // joystick is already setup
    }
    // register for event passing
    m_joysticks.insert(joystick->getId(), joystick);
    addDevice(joystick); // publish joystick

    return joystick;
}

bool InputManager::closeJoystick(SDL_JoystickID id) {
    // only remove known joysticks
    Joystick *joystick = m_joysticks.value(id, NULL);
    if (joystick == NULL) {
        return false;
    }

    // remove from device list, events and delete it
    removeDevice(joystick);
    m_joysticks.remove(id);
    delete joystick;

    return true;
}
#endif // SDL2_FOUND

QStringList InputManager::devices() const
{
    // device names
    return m_devices.keys();
}

bool InputManager::addBinding(uint generation, uint id, const QString &device)
{
    InputDevice *d = m_devices.value(device);
    if (!d) { // ignore unknown devices
        return false;
    }

    QPair<uint, uint> rid(generation, id);
    // set controlling device
    m_bindings[rid] = d;
    return true;
}

void InputManager::removeBinding(uint generation, uint id)
{
    QPair<uint, uint> rid(generation, id);
    if (m_bindings.contains(rid)) {
        m_bindings[rid]->setStrategyControlled(false);
        m_bindings.remove(rid);
    }
}

void InputManager::setStrategyControlled(uint generation, uint id, bool strategyControlled)
{
    QPair<uint, uint> rid(generation, id);
    if (m_bindings.contains(rid)) {
        m_bindings[rid]->setStrategyControlled(strategyControlled);
    }
}

void InputManager::setNetworkControlled(uint generation, uint id, bool networkControlled)
{
    QPair<uint, uint> rid(generation, id);
    if (networkControlled) {
        m_networkControl[rid] = true;
    } else {
        m_networkControl.remove(rid);
    }
}

void InputManager::setMaxSpeed(double speed)
{
    m_maxSpeed = speed;
}

void InputManager::setMaxOmega(double speed)
{
    m_maxOmega = speed;
}

void InputManager::setDribblerPower(double dribblerPower)
{
    m_dribblerPower = qBound(0., dribblerPower, 1.);
}

void InputManager::setShootPower(double shootPower)
{
    m_shootPower = qBound(0., shootPower, 10.);
}

void InputManager::setEnabled(bool enabled)
{
    m_enabled = enabled;
}

void InputManager::setGlobal(bool global)
{
    setDirect(!global);
}

void InputManager::setDirect(bool direct)
{
    m_direct = direct;
    foreach (InputDevice *device, m_devices) {
        device->setDirect(m_direct);
    }
}
