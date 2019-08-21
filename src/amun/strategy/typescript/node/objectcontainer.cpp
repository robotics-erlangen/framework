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

#include "objectcontainer.h"

#include <map>
#include <memory>
#include <QList>
#include <QString>
#include <string>
#include <utility>
#include "v8.h"

#include "../v8utility.h"

template <typename T> inline void USE(T&&) {}

using v8::EscapableHandleScope;
using v8::External;
using v8::FunctionTemplate;
using v8::HandleScope;
using v8::Isolate;
using v8::Local;
using v8::NewStringType;
using v8::Object;
using v8::ObjectTemplate;
using v8::String;

using namespace v8helper;

namespace Node {

ObjectContainer::ObjectContainer(Isolate* isolate, const ObjectContainer* requireNamespace)
    : m_isolate(isolate), m_requireNamespace(requireNamespace) {
}

ObjectContainer::~ObjectContainer() {
}

Local<Object> ObjectContainer::getHandle() {
    EscapableHandleScope handleScope(m_isolate);
    Local<Object> object = m_handle.Get(m_isolate);
    return handleScope.Escape(object);
}

ObjectContainer* ObjectContainer::get(const std::string& index) const {
    auto child = m_children.find(index);
    if (child != m_children.end()) {
        return child->second.get();
    } else {
        return nullptr;
    }
}

void ObjectContainer::put(const std::string& index, std::unique_ptr<ObjectContainer> object) {
    if (!m_handle.IsEmpty()) {
        Local<Object> ownObject = m_handle.Get(m_isolate);
        Local<String> propertyName = v8string(m_isolate, index);
        // what does the return value even mean?
        USE(ownObject->Set(m_isolate->GetCurrentContext(), propertyName, object->getHandle()));
    }
    // TODO funktioniert das?
    m_children.emplace(index, std::move(object));
}

void ObjectContainer::setHandle(Local<Object> handle) {
    m_handle.Reset(m_isolate, handle);
}

template<> Local<ObjectTemplate> ObjectContainer::createTemplateWithCallbacks(const QList<CallbackInfo>& callbackInfos) {
    EscapableHandleScope handleScope(m_isolate);
    Local<ObjectTemplate> resultingTemplate = ObjectTemplate::New(m_isolate);
    for (const auto& callbackInfo : callbackInfos) {
        auto functionTemplate = FunctionTemplate::New(m_isolate, callbackInfo.callback, External::New(m_isolate, this));
        resultingTemplate->Set(m_isolate, callbackInfo.name, functionTemplate);
    }
    return handleScope.Escape(resultingTemplate);
}

template<> Local<FunctionTemplate> ObjectContainer::createTemplateWithCallbacks(const QList<CallbackInfo>& callbackInfos) {
    EscapableHandleScope handleScope(m_isolate);
    Local<FunctionTemplate> resultingTemplate = FunctionTemplate::New(m_isolate);
    for (const auto& callbackInfo : callbackInfos) {
        auto functionTemplate = FunctionTemplate::New(m_isolate, callbackInfo.callback, External::New(m_isolate, this));
        resultingTemplate->Set(m_isolate, callbackInfo.name, functionTemplate);
    }
    return handleScope.Escape(resultingTemplate);
}

}
