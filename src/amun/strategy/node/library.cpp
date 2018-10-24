/***************************************************************************
 *   Copyright 2018 Paul Bergmann                                        *
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

 #include "library.h"

using namespace v8;

Library::Library(v8::Isolate* isolate) : m_isolate(isolate) {
}

Local<Object> Library::getHandle() {
    EscapableHandleScope handleScope(m_isolate);
    Local<Object> object = m_libraryHandle.Get(m_isolate);
    return handleScope.Escape(object);
}

void Library::setLibraryHandle(Local<Object> handle) {
    m_libraryHandle.Reset(m_isolate, handle);
}

Local<ObjectTemplate> Library::createObjectTemplateWithCallbacks(const QList<CallbackInfo>& callbackInfos) {
    Local<ObjectTemplate> object = ObjectTemplate::New(m_isolate);
    for (auto callbackInfo : callbackInfos) {
        Local<String> functionName = String::NewFromUtf8(m_isolate, callbackInfo.name, NewStringType::kNormal).ToLocalChecked();
        auto functionTemplate = FunctionTemplate::New(m_isolate, callbackInfo.callback, External::New(m_isolate, this));
        object->Set(functionName, functionTemplate);
    }
    return object;
}

void Library::throwV8Exception(const QString& message) const {
    HandleScope handleScope(m_isolate);
    Local<String> exceptionText = String
        ::NewFromUtf8(m_isolate, message.toUtf8().constData(), NewStringType::kNormal)
        .ToLocalChecked();
    m_isolate->ThrowException(exceptionText);
}
