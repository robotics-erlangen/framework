/***************************************************************************
 *   Copyright 2022 Tobias Heineken                                        *
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

#include "lua_eigen.h"
#include "lua.h"
#include <Eigen/Cholesky>

static int destroyMatrix(lua_State *L) {
    Eigen::MatrixXd *a = (Eigen::MatrixXd *) lua_touserdata(L, 1);
    luaL_argcheck(L, a != NULL, 1, "`matrix' expected");

    a->~Matrix();
    return 0;
}

static void createGCMetatable(lua_State *L) {
    lua_newtable(L);
    lua_pushliteral(L, "__gc");
    lua_pushcfunction(L, destroyMatrix);
    lua_settable(L, -3);
    // Now, the table is again on top of the stack
    lua_setmetatable(L, -2);
}


static int createMatrix(lua_State *L) {
    int x =  luaL_checkint(L, 1);
    int y = luaL_checkint(L, 2);
    size_t nbytes = sizeof(Eigen::MatrixXd);
    void *userData = lua_newuserdata(L, nbytes); /* new userdatum is already on the stack */
    createGCMetatable(L);
    Eigen::MatrixXd *matrix = new (userData) Eigen::MatrixXd(x, y);
    return 1;
}

static void getRowCol(Eigen::MatrixXd* mat, int* rows, int* columns) {
    *rows = mat->rows();
    *columns = mat->cols();
}

static int getmatrix (lua_State *L) {
    Eigen::MatrixXd *a = (Eigen::MatrixXd *) lua_touserdata(L, 1);
    int indexX = luaL_checkint(L, 2);
    int indexY = luaL_checkint(L, 3);

    int rows, cols;
    luaL_argcheck(L, a != NULL, 1, "`matrix' expected");
    getRowCol(a, &rows, &cols);
    luaL_argcheck(L, 1 <= indexX && indexX <= rows, 2, "indexX out of range");
    luaL_argcheck(L, 1 <= indexY && indexY <= cols, 3, "indexY out of range");

    lua_pushnumber(L, a->operator()(indexX-1, indexY-1));
    return 1;
}

static int setarray (lua_State *L) {
    Eigen::MatrixXd *a = (Eigen::MatrixXd *) lua_touserdata(L, 1);
    int indexX = luaL_checkint(L, 2);
    int indexY = luaL_checkint(L, 3);
    double val = luaL_checknumber(L, 4);
    int rows, cols;
    luaL_argcheck(L, a != NULL, 1, "`matrix' expected");
    getRowCol(a, &rows, &cols);
    luaL_argcheck(L, 1 <= indexX && indexX <= rows, 2, "indexX out of range");
    luaL_argcheck(L, 1 <= indexY && indexY <= cols, 3, "indexY out of range");
    a->operator()(indexX-1, indexY-1) = val;
    return 0;
}



static int getsize (lua_State *L) {
    Eigen::MatrixXd *a = (Eigen::MatrixXd *) lua_touserdata(L, 1);

    int rows, cols;
    getRowCol(a, &rows, &cols);
    lua_pushnumber(L, rows);
    lua_pushnumber(L, cols);
    return 2;
}

static int transposed (lua_State *L) {
    Eigen::MatrixXd *a = (Eigen::MatrixXd *) lua_touserdata(L, 1);

    int rows, cols;
    luaL_argcheck(L, a != NULL, 1, "`matrix' expected");
    getRowCol(a, &rows, &cols);

    size_t nbytes = sizeof(Eigen::MatrixXd);
    void *userData = lua_newuserdata(L, nbytes); /* new userdatum is already on the stack */
    createGCMetatable(L);
    Eigen::MatrixXd *matrix = new (userData) Eigen::MatrixXd(rows, cols);

    *matrix = *a;
    matrix->transposeInPlace();
    return 1;
}

static int mat_mul (lua_State *L) {
    Eigen::MatrixXd *a = (Eigen::MatrixXd *) lua_touserdata(L, 1);
    Eigen::MatrixXd *b = (Eigen::MatrixXd *) lua_touserdata(L, 2);

    int rowsA, rowsB, colsA, colsB;
    getRowCol(a, &rowsA, &colsA);
    getRowCol(b, &rowsB, &colsB);

    luaL_argcheck(L, colsA == rowsB, 2, "Matrices are not compatible");

    size_t nbytes = sizeof(Eigen::MatrixXd);
    void *userData = lua_newuserdata(L, nbytes); /* new userdatum is already on the stack */
    createGCMetatable(L);
    Eigen::MatrixXd *matrix = new (userData) Eigen::MatrixXd(rowsA, colsB);

    *matrix = *a * *b;
    return 1;
}

static int solveldlt (lua_State *L) {
    Eigen::MatrixXd *a = (Eigen::MatrixXd *) lua_touserdata(L, 1);
    Eigen::MatrixXd *b = (Eigen::MatrixXd *) lua_touserdata(L, 2);

    int rowsA, rowsB, colsA, colsB;
    getRowCol(a, &rowsA, &colsA);
    getRowCol(b, &rowsB, &colsB);

    luaL_argcheck(L, rowsA == rowsB, 1, "dimensions do not match");

    size_t nbytes = sizeof(Eigen::MatrixXd);
    void *userData = lua_newuserdata(L, nbytes); /* new userdatum is already on the stack */
    createGCMetatable(L);
    Eigen::MatrixXd *matrix = new (userData) Eigen::MatrixXd(colsA, 1);
    *matrix = a->ldlt().solve(*b);
    return 1;
}

static const luaL_Reg eigenMethods[] = {
    {"createMatrix", createMatrix},
    {"destroyMatrix", destroyMatrix},
    {"getsize", getsize},
    {"setmatrix", setarray},
    {"getmatrix", getmatrix},
    {"transposed", transposed},
    {"matrix_multiplication", mat_mul},
    {"solve", solveldlt},
    {0, 0}
};

int eigenRegister(lua_State *state)
{
    luaL_register(state, "eigen", eigenMethods);
    return 0;
}
