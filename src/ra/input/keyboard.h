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

#ifndef KEYBOARD_H
#define KEYBOARD_H

#include "inputdevice.h"
#include <QMap>

class Keyboard : public InputDevice
{
public:
    Keyboard();
    ~Keyboard() override;

protected:
    bool eventFilter(QObject *obj, QEvent *e) override;

private:
    void press(int);
    void release(int);
    void releaseAll();
    void updateCommand();

private:
    enum Key
    {
        KeyForward, KeyBackward,
        KeyLeft, KeyRight,
        KeyTurnLeft, KeyTurnRight,
        KeyDribbler, KeyShoot, KeyShootChip,

        KeyMaxEntry
    };

    QMap<int, Key> m_keyMap;
    float m_keyState[KeyMaxEntry];
};

#endif // KEYBOARD_H
