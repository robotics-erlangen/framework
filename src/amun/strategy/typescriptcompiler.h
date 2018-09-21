/***************************************************************************
 *   Copyright 2018 Andreas Wendler                                        *
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

#ifndef TYPESCRIPTCOMPILER_H
#define TYPESCRIPTCOMPILER_H

#include "abstractstrategyscript.h"

#include <QString>
#include <v8.h>
#include <v8-profiler.h>

class TypescriptCompiler
{
    TypescriptCompiler();
    ~TypescriptCompiler();

private:
    static void requireModule(const v8::FunctionCallbackInfo<v8::Value>& args);
    void startCompiler(const QString &filename);
    void registerRequireFunction(v8::Local<v8::ObjectTemplate> global);

private:
    v8::Isolate* m_isolate;
    v8::Persistent<v8::Context> m_context;
};

#endif // TYPESCRIPTCOMPILER_H
