/***************************************************************************
 *   Copyright 2014 Michael Eischer, Philipp Nordhus                       *
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

#include "lua_vector.h"
#include <cmath>
#include <cstring>
#include <QString>

typedef struct Vector {
    lua_Number x;
    lua_Number y;
    bool readOnly;
} Vector;

static Vector *checkVector(lua_State *L, int index)
{
    Vector *v = (Vector *) luaL_checkudata(L, index, "Vector");
    if (v == NULL) {
        luaL_typerror(L, index, "Vector");
    }
    return v;
}

static Vector *pushVector(lua_State *L)
{
    Vector *v = (Vector *) lua_newuserdata(L, sizeof(Vector));
    luaL_getmetatable(L, "Vector");
    lua_setmetatable(L, -2);
    // unset readyonly field on copy
    v->readOnly = false;
    return v;
}

static int vectorCreate(lua_State *L)
{
    const lua_Number x = luaL_optnumber(L, 1, 0.0);
    const lua_Number y = luaL_optnumber(L, 2, 0.0);
    const bool readOnly = lua_toboolean(L, 3);

    Vector *v = pushVector(L);
    v->x = x;
    v->y = y;
    v->readOnly = readOnly;
    return 1;
}

static int vectorIndex(lua_State *L)
{
    const Vector *v = checkVector(L, 1);
    const char *key = luaL_checkstring(L, 2);

    // direct access to x and y, functions are accessed via the "metatable"
    if (key[0] == 'x' && key[1] == 0) {
        lua_pushnumber(L, v->x);
        return 1;
    } else if (key[0] == 'y' && key[1] == 0) {
        lua_pushnumber(L, v->y);
        return 1;
    } else {
        lua_getglobal(L, "Vector");
        lua_pushvalue(L, 2);
        lua_rawget(L, -2);
        return 1;
    }

    return 0;
}

static int vectorNewIndex(lua_State *L)
{
    Vector *v = checkVector(L, 1);
    if (v->readOnly) {
        luaL_error(L, "Vector is readonly!");
        return 0;
    }

    const char *key = luaL_checkstring(L, 2);
    const lua_Number value = luaL_checknumber(L, 3);

    if (key[0] == 'x' && key[1] == 0) {
        v->x = value;
    } else if (key[0] == 'y' && key[1] == 0) {
        v->y = value;
    } else {
        luaL_error(L, "Only 'x' and 'y' may be set on Vector!");
    }

    return 0;
}

static int vectorToString(lua_State *L)
{
    const Vector *v = checkVector(L, 1);
    // print 4 digits after the decimal dot
    QString toString = QString("(%1, %2)").arg(QString::number(v->x, 'f', 4), QString::number(v->y, 'f', 4));
    lua_pushstring(L, toString.toLatin1().constData());
    return 1;
}

static int vectorAdd(lua_State *L)
{
    const Vector *v1 = checkVector(L, 1);
    const Vector *v2 = checkVector(L, 2);

    Vector *v = pushVector(L);
    v->x = v1->x + v2->x;
    v->y = v1->y + v2->y;
    return 1;
}

static int vectorSub(lua_State *L)
{
    const Vector *v1 = checkVector(L, 1);
    const Vector *v2 = checkVector(L, 2);

    Vector *v = pushVector(L);
    v->x = v1->x - v2->x;
    v->y = v1->y - v2->y;
    return 1;
}

static int vectorUnm(lua_State *L)
{
    const Vector *v1 = checkVector(L, 1);

    Vector *v = pushVector(L);
    v->x = -v1->x;
    v->y = -v1->y;
    return 1;
}

static int vectorEq(lua_State *L)
{
    const Vector *v1 = checkVector(L, 1);
    const Vector *v2 = checkVector(L, 2);

    lua_pushboolean(L, v1->x == v2->x && v1->y == v2->y);
    return 1;
}

static int vectorMul(lua_State *L)
{
    const Vector *v1 = checkVector(L, 1);
    const lua_Number scalar = luaL_checknumber(L, 2);

    Vector *v = pushVector(L);
    v->x = v1->x * scalar;
    v->y = v1->y * scalar;
    return 1;
}

static int vectorDiv(lua_State *L)
{
    const Vector *v1 = checkVector(L, 1);
    const lua_Number scalar = luaL_checknumber(L, 2);

    Vector *v = pushVector(L);
    v->x = v1->x / scalar;
    v->y = v1->y / scalar;
    return 1;

}

static int vectorLength(lua_State *L)
{
    const Vector *v = checkVector(L, 1);
    lua_pushnumber(L, sqrt(v->x * v->x + v->y * v->y));
    return 1;
}

static int vectorNormalize(lua_State *L)
{
    Vector *v = checkVector(L, 1);
    const lua_Number l = sqrt(v->x * v->x + v->y * v->y);
    // null vector is left unchanged
    if (l > 0) {
        v->x /= l;
        v->y /= l;
    }
    lua_pushvalue(L, 1);
    return 1;
}

static int vectorPerpendicular(lua_State *L)
{
    const Vector *v1 = checkVector(L, 1);

    // rotate by 90 degrees ccw
    Vector *v = pushVector(L);
    v->x =  v1->y;
    v->y = -v1->x;
    return 1;
}

static int vectorCopy(lua_State *L)
{
    const Vector *v1 = checkVector(L, 1);

    Vector *v = pushVector(L);
    v->x = v1->x;
    v->y = v1->y;
    // read-only flag is discarded
    return 1;
}

static int vectorDistanceTo(lua_State* L)
{
    const Vector *v1 = checkVector(L, 1);
    const Vector *v2 = checkVector(L, 2);

    const lua_Number dx = v1->x - v2->x;
    const lua_Number dy = v1->y - v2->y;

    lua_pushnumber(L, sqrt(dx * dx + dy * dy));
    return 1;
}

static int vectorDistToLineSegment(lua_State* L)
{
    const Vector *v = checkVector(L, 1);
    const Vector *lineStart = checkVector(L, 2);
    const Vector *lineEnd = checkVector(L, 3);

    // dir = (lineEnd - lineStart):normalize()
    Vector dir;
    dir.x = lineEnd->x - lineStart->x;
    dir.y = lineEnd->y - lineStart->y;

    const lua_Number l = sqrt(dir.x * dir.x + dir.y * dir.y);
    if (l > 0) {
        dir.x /= l;
        dir.y /= l;
    }

    // local d = self - lineStart
    Vector d;
    d.x = v->x - lineStart->x;
    d.y = v->y - lineStart->y;

    // if d:dot(dir) < 0 then
    //     return d:length()
    // end
    if (d.x * dir.x + d.y * dir.y < 0) {
        lua_pushnumber(L, sqrt(d.x * d.x + d.y * d.y));
        return 1;
    }

    // d = self - lineEnd
    d.x = v->x - lineEnd->x;
    d.y = v->y - lineEnd->y;

    // if d:dot(dir) > 0 then
    //     return d:length()
    // end
    if (d.x * dir.x + d.y * dir.y > 0) {
        lua_pushnumber(L, sqrt(d.x * d.x + d.y * d.y));
        return 1;
    }

    // local normal = dir:perpendicular()
    // return math.abs(d:dot(normal))
    lua_pushnumber(L, fabs(d.x * dir.y + d.y * (-dir.x)));
    return 1;
}

static const luaL_Reg vectorMethods[] = {
    {"create",          vectorCreate},
    {"length",          vectorLength},
    {"distanceTo",      vectorDistanceTo},
    {"normalize",       vectorNormalize},
    {"perpendicular",   vectorPerpendicular},
    {"distanceToLineSegment", vectorDistToLineSegment},
    {"copy",            vectorCopy},
    {0, 0}
};

static const luaL_Reg vectorMeta[] = {
    {"__index", vectorIndex},
    {"__newindex", vectorNewIndex},
    {"__tostring", vectorToString},
    {"__add", vectorAdd},
    {"__sub", vectorSub},
    {"__unm", vectorUnm},
    {"__mul", vectorMul},
    {"__div", vectorDiv},
    {"__eq",  vectorEq},
    {0, 0}
};

int vectorRegister(lua_State *L)
{
    // create vector global
    luaL_register(L, "Vector", vectorMethods);
    // create type metatable and add functions
    luaL_newmetatable(L, "Vector");
    luaL_register(L, 0, vectorMeta);

    // let metatable reference to itself
    lua_pushliteral(L, "__metatable");
    lua_pushvalue(L, -3);
    lua_rawset(L, -3);

    lua_pop(L, 1);
    return 1;
}
