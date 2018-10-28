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

#include "librarycollection.h"

#include <map>
#include <memory>
#include <QString>
#include <utility>
#include "v8.h"

#include "buffer.h"
#include "fs.h"
#include "library.h"
#include "os.h"
#include "path.h"

using namespace v8;

Node::LibraryCollection::LibraryCollection(Local<Context> context) : m_isolate(context->GetIsolate()) {
	auto registerRequireCallback = [this]() {
		Local<String> requireName = String::NewFromUtf8(m_isolate, "require", NewStringType::kNormal).ToLocalChecked();
		Local<Context> context = m_context.Get(m_isolate);
		Local<FunctionTemplate> requireCallbackTemplate = FunctionTemplate::New(m_isolate, &LibraryCollection::requireCallback, External::New(m_isolate, this));
		context->Global()->Set(requireName, requireCallbackTemplate->GetFunction(context).ToLocalChecked());
	};
	auto createLibraryObjects = [this]() {
		m_libraryObjects.insert(std::make_pair("buffer", std::unique_ptr<Library>(new Buffer(m_isolate))));
		m_libraryObjects.insert(std::make_pair("fs", std::unique_ptr<Library>(new FS(m_isolate))));
		m_libraryObjects.insert(std::make_pair("os", std::unique_ptr<Library>(new OS(m_isolate))));
		m_libraryObjects.insert(std::make_pair("path", std::unique_ptr<Library>(new Path(m_isolate))));
	};

	HandleScope handleScope(m_isolate);
	Context::Scope contextScope(context);
	m_context.Reset(m_isolate, context);

	registerRequireCallback();
	createLibraryObjects();
}

MaybeLocal<Object> Node::LibraryCollection::require(const QString& moduleName) {
	EscapableHandleScope handleScope(m_isolate);
	MaybeLocal<Object> obj;
	auto library = m_libraryObjects.find(moduleName);
	if (library != m_libraryObjects.end()) {
		obj = MaybeLocal<Object>(library->second->getHandle());
	}
	return handleScope.EscapeMaybe(obj);
}

void Node::LibraryCollection::requireCallback(const FunctionCallbackInfo<Value>& args) {
	auto isolate = args.GetIsolate();
	HandleScope handleScope(isolate);

	if (args.Length() != 1 || !args[0]->IsString()) {
		Local<String> exceptionText = String::NewFromUtf8(isolate, "require needs exactly one string argument",
				NewStringType::kNormal).ToLocalChecked();
		isolate->ThrowException(exceptionText);
	}
	QString moduleName = *String::Utf8Value(args[0]);
	auto libraryCollection = static_cast<LibraryCollection*>(Local<External>::Cast(args.Data())->Value());
	MaybeLocal<Object> libraryMaybe = libraryCollection->require(moduleName);
	Local<Object> library;
	if (libraryMaybe.ToLocal(&library)) {
		args.GetReturnValue().Set(library);
	} else {
		auto errorMessage = QString("module '%1' not found").arg(moduleName);
		Local<String> exceptionText = String::NewFromUtf8(isolate, errorMessage.toUtf8().constData(),
				NewStringType::kNormal).ToLocalChecked();
		isolate->ThrowException(exceptionText);
	}
}
