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

#ifndef INPUTMANAGER_H
#define INPUTMANAGER_H

#include "protobuf/command.h"
#include "protobuf/ssl_referee.pb.h"
#include <QMap>
#include <QStringList>
#include <QPair>
#ifdef SDL2_FOUND
//#include <SDL_joystick.h>
typedef int32_t SDL_JoystickID; // avoid pulling in the sdl header
#endif // SDL2_FOUND

class InputDevice;
class Joystick;
class QTimer;

class InputManager : public QObject
{
    Q_OBJECT

public:
    explicit InputManager(QObject *parent = NULL);
    ~InputManager() override;
    InputManager(const InputManager&) = delete;
    InputManager& operator=(const InputManager&) = delete;

signals:
    // input manager signals
    void sendCommand(const Command &command);
    void devicesUpdated();
    // forwarded from input devices
    void sendRefereeCommand(SSL_Referee::Command command);
    void toggleTransceiver();

public:
    QStringList devices() const;

public slots:
    void enableInputCollection();
    void disableInputCollection();

    bool addBinding(uint generation, uint id, const QString &device);
    void removeBinding(uint generation, uint id);
    void setStrategyControlled(uint generation, uint id, bool strategyControlled);
    void setNetworkControlled(uint generation, uint id, bool networkControlled);
    void setEjectSdcard(uint generation, uint id);
    void setMaxSpeed(double speed);
    void setMaxOmega(double speed);
    void setDribblerPower(double dribblerPower);
    void setShootPower(double shootPower);
    void setEnabled(bool enabled);
    void setLocal(bool local);
    void setGlobal(bool global);
#ifdef SDL2_FOUND
    void setDeadzone(double deadzone);
#endif // SDL2_FOUND

private slots:
    void update();

private:
    void addDevice(InputDevice *device);
    void removeDevice(InputDevice *device);

#ifdef SDL2_FOUND
    Joystick *openJoystick(int deviceId);
    bool closeJoystick(SDL_JoystickID id);
#endif // SDL2_FOUND

private:
    QMap<QString, InputDevice*> m_devices;
    typedef QMap<QPair<uint, uint>, InputDevice*> BindingsMap;
    BindingsMap m_bindings;
    typedef QMap<QPair<uint, uint>, bool> NetworkControlMap;
    NetworkControlMap m_networkControl;
    typedef QMap<QPair<uint, uint>, int> EjectSdcardMap;
    EjectSdcardMap m_ejectSdcard;

#ifdef SDL2_FOUND
    QMap<SDL_JoystickID, Joystick*> m_joysticks;
#endif // SDL2_FOUND

    float m_maxSpeed;
    float m_maxOmega;
    float m_dribblerPower;
    float m_shootPower;
    float m_deadzone;
    bool m_enabled;
    bool m_isLocal;
    bool m_lastCommandWasEmpty;

    QTimer *m_timer;
};

#endif // INPUTMANAGER_H
