/***************************************************************************
 *   Copyright 2014 Alexander Danzer. Michael Eischer                      *
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

#include "lua_math.h"
#include "math_eqn.h"

static int mathSolveEquation(lua_State* L)
{
    const lua_Number a = luaL_optnumber(L, 1, 0.0);
    const lua_Number b = luaL_optnumber(L, 2, 0.0);
    const lua_Number c = luaL_optnumber(L, 3, 0.0);
    const lua_Number d = luaL_optnumber(L, 4, 0.0);
    const lua_Number e = luaL_optnumber(L, 5, 0.0);

    int solutions = 0;

    if(e != 0) { //quartic
        double s[4];
        double eq[5] = {a, b, c, d, e};
		solutions = SolveQuartic(eq, s);
        for(int i = 0; i < solutions; ++i) {
            lua_pushnumber(L, s[i]);
        }
    } else if(d != 0) { //cubic
        double s[3];
        double eq[4] = {a, b, c, d};
		solutions = SolveCubic(eq, s);
        for(int i = 0; i < solutions; ++i) {
            lua_pushnumber(L, s[i]);
        }
    } else if(c != 0) { //quadric
        double s[2];
        double eq[3] = {a, b, c};
		solutions = SolveQuadric(eq, s);
        for(int i = 0; i < solutions; ++i) {
            lua_pushnumber(L, s[i]);
        }
    } else if(b != 0) { //linear
        lua_pushnumber(L, -a/b);
        solutions = 1;
    } else if(a != 0) { //nil
        solutions = 0;
    } else {
        lua_pushnumber(L, 0);
        solutions = 1;
    }

    return solutions;
}

static const luaL_Reg mathMethods[] = {
    {"solveEquation",          mathSolveEquation},
    {0, 0}
};

int mathRegister(lua_State *L)
{
    // bind to global math object
    luaL_register(L, "math", mathMethods);

    lua_pop(L, 1);
    return 1;
}
