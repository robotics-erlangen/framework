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

#ifndef INTERNALTYPESCRIPTCOMPILER_H
#define INTERNALTYPESCRIPTCOMPILER_H

#include <memory>
#include <functional>
#include <utility>
#include <QByteArray>
#include <QBuffer>
#include <QString>
#include "v8.h"

#include "typescriptcompiler.h"

namespace Node
{
    class ObjectContainer;
}

class QString;

class InternalTypescriptCompiler : public TypescriptCompiler
{
public:
    InternalTypescriptCompiler(const QFileInfo &tsconfig);
    ~InternalTypescriptCompiler();
private:
    void initializeEnvironment();

    void registerRequireFunction(v8::Local<v8::ObjectTemplate> global);
    static void requireCallback(const v8::FunctionCallbackInfo<v8::Value>& args);
    static void processCwdCallback(const v8::FunctionCallbackInfo<v8::Value>& args);
    static void exitCompilation(const v8::FunctionCallbackInfo<v8::Value>& args);
    static void stdoutCallback(const v8::FunctionCallbackInfo<v8::Value>& args);

    // WARNING: this function is NOT re-entrant
    std::pair<CompileResult, QString> performCompilation() override;
    void handleExitcode(bool exitcodeValid, int exitcode);
private:
    v8::Isolate* m_isolate;
    // The isolate does not take ownership of the allocator.
    // Hence it needs to be stored and deleted manually.
    std::unique_ptr<v8::ArrayBuffer::Allocator> m_arrayAllocator;
    v8::Global<v8::Context> m_context;

    std::unique_ptr<Node::ObjectContainer> m_requireNamespace;
    bool running = false;

    const QString m_compilerPath;

    std::pair<CompileResult, QString> m_lastResult;
    QString m_stdout;
};

#endif // INTERNALTYPESCRIPTCOMPILER_H
