/***************************************************************************
 *   Copyright 2015 Michael Eischer, Jan Kallwies, Philipp Nordhus         *
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

#include "keyboard.h"
#include <QCoreApplication>
#include <QKeyEvent>

Keyboard::Keyboard() :
    InputDevice("Keyboard")
{
    m_keyMap['W'] = KeyForward;
    m_keyMap['S'] = KeyBackward;
    m_keyMap['A'] = KeyLeft;
    m_keyMap['D'] = KeyRight;
    m_keyMap['Q'] = KeyTurnLeft;
    m_keyMap['E'] = KeyTurnRight;
    m_keyMap['R'] = KeyDribbler;
    m_keyMap['F'] = KeyShoot;
    m_keyMap['G'] = KeyShootChip;

    releaseAll();

    // app global keyboard listener
    qApp->installEventFilter(this);
}

Keyboard::~Keyboard()
{
    qApp->removeEventFilter(this);
}

bool Keyboard::eventFilter(QObject *obj, QEvent *event)
{
    if (event->type() == QEvent::KeyPress) {
        QKeyEvent *keyEvent = static_cast<QKeyEvent*>(event);
        press(keyEvent->key());
    }

    if (event->type() == QEvent::KeyRelease) {
        QKeyEvent *keyEvent = static_cast<QKeyEvent*>(event);
        release(keyEvent->key());
    }

    return QObject::eventFilter(obj, event);
}

void Keyboard::press(int key)
{
    if (!m_keyMap.contains(key)) {
        return;
    }

    // set key pressure
    const Key k = m_keyMap.value(key);
    m_keyState[k] = 1.0f;

    switch (k) {
    case KeyDribbler:
        m_command.set_dribbler(1.0f);
        break;

    case KeyShootChip:
    case KeyShoot:
        m_command.set_kick_power(1.0f);
        m_command.set_kick_style(k == KeyShoot ? robot::Command::Linear : robot::Command::Chip);
        break;

    default:
        break;
    }

    updateCommand();
}

void Keyboard::release(int key)
{
    if (!m_keyMap.contains(key)) {
        return;
    }

    // unpress key
    const Key k = m_keyMap.value(key);
    m_keyState[k] = 0.0f;

    if (k == KeyDribbler) {
        m_command.set_dribbler(0.0f);
    }

    if (k == KeyShoot || k == KeyShootChip) {
        m_command.set_kick_power(0.0f);
    }

    updateCommand();
}

void Keyboard::releaseAll()
{
    // set pressure to zero for every key
    memset(m_keyState, 0, sizeof(m_keyState));
    resetCommand();
}

void Keyboard::updateCommand()
{
    // calculate movement commands
    m_command.set_v_s(m_keyState[KeyRight] - m_keyState[KeyLeft]);
    m_command.set_v_f(m_keyState[KeyForward] - m_keyState[KeyBackward]);
    m_command.set_omega(m_keyState[KeyTurnLeft] - m_keyState[KeyTurnRight]);
}
