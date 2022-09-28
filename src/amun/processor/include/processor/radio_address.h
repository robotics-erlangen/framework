/***************************************************************************
 *   Copyright 2022 Paul Bergmann                                          *
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

#ifndef RADIO_ADDRESS_H
#define RADIO_ADDRESS_H

#include <QtGlobal>

namespace Radio {
    struct UnicastTag {};
    inline constexpr UnicastTag Unicast {};

    struct BroadcastTag {};
    inline constexpr BroadcastTag Broadcast {};

    inline constexpr int TARGET_BROADCAST = -1;

    enum class Generation {
        Gen2014,
        Gen2018,
    };

    class Address {
    public:
        constexpr Address(BroadcastTag, Generation generation) :
            generation(generation),
            m_target(TARGET_BROADCAST) {}

        constexpr Address(UnicastTag, Generation generation, int id):
            generation(generation),
            m_target(id)
        {
            Q_ASSERT(m_target >= 0 && m_target <= 15);
        }

        bool isBroadcast() const { return m_target == TARGET_BROADCAST; }

        bool isUnicast() const { return m_target != TARGET_BROADCAST; }
        int unicastTarget() const { return m_target; }

    public:
        Generation generation;

    private:
        int m_target;
    };
}

#endif  // RADIO_ADDRESS_H
