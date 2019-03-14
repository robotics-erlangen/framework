/***************************************************************************
 *   Copyright 2018 Andreas Wendler, Paul Bergmann, Tobias Heineken        *
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

#include <memory>
#include <functional>
#include "v8.h"

namespace Node
{
    class ObjectContainer;
}

class QString;

class TypescriptCompiler
{
public:
    TypescriptCompiler(const QString& filename);
    TypescriptCompiler(const QString& filename, std::function<void(int)> onTermination);
    ~TypescriptCompiler();

    void startCompiler();
private:
    void registerRequireFunction(v8::Local<v8::ObjectTemplate> global);
    static void requireCallback(const v8::FunctionCallbackInfo<v8::Value>& args);
    static void processCwdCallback(const v8::FunctionCallbackInfo<v8::Value>& args);
    static void exitCompilation(const v8::FunctionCallbackInfo<v8::Value>& args);

private:
    v8::Isolate* m_isolate;
    v8::Global<v8::Context> m_context;

    std::unique_ptr<Node::ObjectContainer> m_requireNamespace;
    std::function<void(int)> m_terminateFun;
    bool running = false;
};

#endif // TYPESCRIPTCOMPILER_H
