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

#include "fs.h"

#include "objectcontainer.h"

#include <QByteArray>
#include <QDateTime>
#include <QDir>
#include <QFile>
#include <QList>
#include <QString>
#include <string>
#include "v8.h"

using v8::Date;
using v8::NewStringType;
using v8::Function;
using v8::External;
using v8::FunctionCallbackInfo;
using v8::HandleScope;
using v8::Isolate;
using v8::Local;
using v8::Object;
using v8::ObjectTemplate;
using v8::PropertyCallbackInfo;
using v8::String;
using v8::Value;

Node::fs::fs(Isolate* isolate, const ObjectContainer* requireNamespace) : ObjectContainer(isolate, requireNamespace) {
    HandleScope handleScope(m_isolate);

    auto objectTemplate = createTemplateWithCallbacks<ObjectTemplate>({
        //{ "openSync", &FS::openSync },
        { "mkdirSync", &fs::mkdirSync },
        { "statSync", &fs::statSync },
        //{ "watchFile", &fs::watchFile },
        //{ "unwatchFile", &fs::unwatchFile },
        //{ "watch", &fs::watch },
        { "readFileSync", &fs::readFileSync },
        //{ "writeSync", &fs::writeSync },
        //{ "closeSync", &fs::closeSync },
        //{ "readdirSync", &fs::readdirSync },
        //{ "realpathSync", &fs::realpathSync },
        //{ "utimesSync", &fs::utimesSync },
        //{ "unlinkSync", &fs::unlinkSync }
    });

    auto fileStatTemplate = createTemplateWithCallbacks<ObjectTemplate>({
            { "isDirectory", &FileStat::isDirectory },
            { "isFile", &FileStat::isFile }
    });
    fileStatTemplate->SetInternalFieldCount(1);
    fileStatTemplate->SetAccessor(String::NewFromUtf8(m_isolate, "size"), &FileStat::sizeGetter, &FileStat::sizeSetter);
    fileStatTemplate->SetAccessor(String::NewFromUtf8(m_isolate, "mtime"), &FileStat::mtimeGetter, &FileStat::mtimeSetter);
    m_fileStatTemplate.Reset(m_isolate, fileStatTemplate);

    setHandle(objectTemplate->NewInstance(m_isolate->GetCurrentContext()).ToLocalChecked());
}

Node::fs::FileStat::FileStat(const fs* fs, const QString& info) {
    QFileInfo fileInfo(info);
    if (!fileInfo.exists()) {
        QString errorText = QString("file '%1' does not exist").arg(info);
        fs->throwV8Exception(errorText);
        return;
    }
    size = static_cast<double>(fileInfo.size());
    mtimeMs = static_cast<double>(fileInfo.lastModified().toMSecsSinceEpoch());
    if (fileInfo.isDir()) {
        type = Type::Directory;
    } else if (fileInfo.isFile()) {
        type = Type::File;
    } else {
        type = Type::Other;
    }
}

void Node::fs::FileStat::sizeGetter(Local<String> property, const PropertyCallbackInfo<Value>& info) {
    Local<Object> self = info.Holder();
    Local<External> wrap = Local<External>::Cast(self->GetInternalField(OBJECT_FILESTAT_INDEX));
    auto fileStat = static_cast<Node::fs::FileStat*>(wrap->Value());
    info.GetReturnValue().Set(fileStat->size);
}

void Node::fs::FileStat::sizeSetter(Local<String> property, Local<Value> value, const PropertyCallbackInfo<void>& info) {
    Local<Object> self = info.Holder();
    Local<External> wrap = Local<External>::Cast(self->GetInternalField(OBJECT_FILESTAT_INDEX));
    auto fileStat = static_cast<Node::fs::FileStat*>(wrap->Value());
    fileStat->size = value->Int32Value();
}

void Node::fs::FileStat::mtimeGetter(Local<String> property, const PropertyCallbackInfo<Value>& info) {
    Local<Object> self = info.Holder();
    Local<External> wrap = Local<External>::Cast(self->GetInternalField(OBJECT_FILESTAT_INDEX));
    auto fileStat = static_cast<Node::fs::FileStat*>(wrap->Value());
    info.GetReturnValue().Set(Date::New(info.GetIsolate(), fileStat->mtimeMs));
}

void Node::fs::FileStat::mtimeSetter(Local<String> property, Local<Value> value, const PropertyCallbackInfo<void>& info) {
    Local<Object> self = info.Holder();
    Local<External> wrap = Local<External>::Cast(self->GetInternalField(OBJECT_FILESTAT_INDEX));
    auto fileStat = static_cast<Node::fs::FileStat*>(wrap->Value());
    fileStat->mtimeMs = value->NumberValue();
}

void Node::fs::FileStat::isDirectory(const FunctionCallbackInfo<Value>& info) {
    Local<Object> self = info.Holder();
    Local<External> wrap = Local<External>::Cast(self->GetInternalField(OBJECT_FILESTAT_INDEX));
    auto fileStat = static_cast<Node::fs::FileStat*>(wrap->Value());
    info.GetReturnValue().Set(fileStat->type == FileStat::Type::Directory);
}

void Node::fs::FileStat::isFile(const FunctionCallbackInfo<Value>& info) {
    Local<Object> self = info.Holder();
    Local<External> wrap = Local<External>::Cast(self->GetInternalField(OBJECT_FILESTAT_INDEX));
    auto fileStat = static_cast<FileStat*>(wrap->Value());
    info.GetReturnValue().Set(fileStat->type == FileStat::Type::File);
}

void Node::fs::mkdirSync(const FunctionCallbackInfo<Value>& args) {
    auto fs = static_cast<Node::fs*>(Local<External>::Cast(args.Data())->Value());
    if (args.Length() < 1 || !args[0]->IsString()) {
        fs->throwV8Exception("mkdirSync needs the first argument to be a string");
        return;
    }
    QString name = *String::Utf8Value(args[0]);
    QDir dir;
    dir.mkpath(name);
}

void Node::fs::statSync(const FunctionCallbackInfo<Value>& args) {
    auto fs = static_cast<Node::fs*>(Local<External>::Cast(args.Data())->Value());
    if (args.Length() < 1 || !args[0]->IsString()) {
        fs->throwV8Exception("statSync needs the first argument to be a string");
        return;
    }
    QString name = *String::Utf8Value(args[0]);

    auto isolate = fs->m_isolate;
    Local<ObjectTemplate> fileStatTemplate = fs->m_fileStatTemplate.Get(isolate);
    Local<Object> obj = fileStatTemplate->NewInstance(isolate->GetCurrentContext()).ToLocalChecked();
    // TODO handle if FileStat constructor throws v8 Exception
    obj->SetInternalField(OBJECT_FILESTAT_INDEX, External::New(isolate, new FileStat(fs, name)));

    args.GetReturnValue().Set(obj);
}

void Node::fs::readFileSync(const FunctionCallbackInfo<Value>& args) {
    auto isolate = args.GetIsolate();
    auto fs = static_cast<Node::fs*>(Local<External>::Cast(args.Data())->Value());
    if (args.Length() < 1 || !args[0]->IsString()) {
        fs->throwV8Exception("readFileSync needs the first argument to be a string");
        return;
    }

    QString fileName = *String::Utf8Value(args[0]);
    QFile file(fileName);
    if (!file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        fs->throwV8Exception(QString("file '%s' could not be opened").arg(fileName));
        return;
    }
    QByteArray fileBytes = file.readAll();
    Local<String> dataString = String::NewFromUtf8(isolate, fileBytes.data(), NewStringType::kNormal).ToLocalChecked();

    auto context = isolate->GetCurrentContext();
    // how horrible
    Local<Object> Buffer = fs->m_requireNamespace
        ->get("buffer")
        ->get("Buffer")
        ->getHandle();
    Local<String> bufferFromName = String::NewFromUtf8(isolate, "from", NewStringType::kNormal).ToLocalChecked();
    Local<Function> bufferFrom = Buffer
        ->Get(context, bufferFromName)
        .ToLocalChecked()
        .As<Function>();

    Local<Value> argv[] = { dataString };
    args.GetReturnValue().Set(bufferFrom->Call(context, Buffer, 1, argv).ToLocalChecked());
}
