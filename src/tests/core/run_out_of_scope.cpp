/***************************************************************************
 *   Copyright 2021 Tobias Heineken                                        *
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
#include "core/run_out_of_scope.h"

static int roosTestInt;

TEST(RunOutOfScope, Running) {
    roosTestInt = 4;
    ASSERT_EQ(roosTestInt, 4);

    {
        RUN_WHEN_OUT_OF_SCOPE({roosTestInt = 6;});
    }

    ASSERT_EQ(roosTestInt, 6);
}


TEST(RunOutOfScope, Delay) {
    roosTestInt = 4;
    ASSERT_EQ(roosTestInt, 4);

    {
        RUN_WHEN_OUT_OF_SCOPE({roosTestInt = 6;});
        ASSERT_EQ(roosTestInt, 4);
    }

    ASSERT_EQ(roosTestInt, 6);
}

TEST(RunOutOfScope, Locals) {
    int local = 3;
    {
        RUN_WHEN_OUT_OF_SCOPE({ local=5;});
        ASSERT_EQ(local, 3);
    }
    ASSERT_EQ(local, 5);
}

TEST(RunOutOfScope, Loops) {
    int local = 2;
    for(int i=2; i < 120; ++i){
        RUN_WHEN_OUT_OF_SCOPE({ local++; });
        ASSERT_EQ(local, i);
    }
    ASSERT_EQ(local, 120);
}
