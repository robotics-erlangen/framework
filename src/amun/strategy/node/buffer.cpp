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

#include "buffer.h"

#include "v8.h"

using namespace v8;

Node::Buffer::Buffer(Isolate* isolate) : Library(isolate) {
	HandleScope handleScope(m_isolate);

	auto objectTemplate = createTemplateWithCallbacks<ObjectTemplate>({
		{ "Buffer", &Buffer::bufferClass },
	});

	auto bufferConstructorTemplate = createTemplateWithCallbacks<FunctionTemplate>({
		{ "from", &Buffer::from },
	});
	Local<ObjectTemplate> bufferPrototype = bufferConstructorTemplate->PrototypeTemplate();
	bufferPrototype->SetInternalFieldCount(1);
	Local<Function> bufferConstructor = bufferConstructorTemplate->GetFunction(m_isolate->GetCurrentContext()).ToLocalChecked();
	m_bufferConstructor.Reset(m_isolate, bufferConstructor);

	setLibraryHandle(objectTemplate->NewInstance(m_isolate->GetCurrentContext()).ToLocalChecked());
}

void Node::Buffer::bufferClass(const FunctionCallbackInfo<Value>& args) {
	auto buffer = static_cast<Buffer*>(Local<External>::Cast(args.Data())->Value());
	Local<Object> bufferConstructor = buffer->m_bufferConstructor.Get(buffer->m_isolate);
	args.GetReturnValue().Set(bufferConstructor);
}

void Node::Buffer::from(const FunctionCallbackInfo<Value>& args) {
	auto buffer = static_cast<Buffer*>(Local<External>::Cast(args.Data())->Value());
	auto isolate = buffer->m_isolate;
	if (args.Length() < 1 || !args[0]->IsString()) {
		buffer->throwV8Exception("Buffer.from needs the first argument to be a string");
	}
	QString dataString;
	QString encoding = args.Length() >= 2 && args[1]->IsString() ? *String::Utf8Value(args[1]) : "utf8";
	if (encoding == "utf8") {
	}
}
