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

#include "gtest/gtest.h"
#include "processor/radio_address.h"

using namespace Radio;

TEST(Radio_Address, Generation) {
    Address unicast2014 { Unicast, Generation::Gen2014, 1 };
    ASSERT_EQ(unicast2014.generation, Generation::Gen2014);
    Address broadcast2014 { Broadcast, Generation::Gen2014 };
    ASSERT_EQ(broadcast2014.generation, Generation::Gen2014);
    Address unicast2018 { Unicast, Generation::GenPasta, 1 };
    ASSERT_EQ(unicast2018.generation, Generation::GenPasta);
    Address broadcast2018 { Broadcast, Generation::GenPasta };
    ASSERT_EQ(broadcast2018.generation, Generation::GenPasta);
}

TEST(Radio_Address, Unicast) {
    Address addr2014 { Unicast, Generation::Gen2014, 1 };
    ASSERT_TRUE(addr2014.isUnicast());
    ASSERT_EQ(addr2014.unicastTarget(), 1);

    Address addr2018 { Unicast, Generation::GenPasta, 1 };
    ASSERT_TRUE(addr2018.isUnicast());
    ASSERT_EQ(addr2018.unicastTarget(), 1);
}

TEST(Radio_Address, Broadcast) {
    Address addr2014 { Broadcast, Generation::Gen2014 };
    ASSERT_TRUE(addr2014.isBroadcast());
    ASSERT_EQ(addr2014.unicastTarget(), TARGET_BROADCAST);

    Address addr2018 { Broadcast, Generation::GenPasta };
    ASSERT_TRUE(addr2018.isBroadcast());
    ASSERT_EQ(addr2018.unicastTarget(), TARGET_BROADCAST);
}
