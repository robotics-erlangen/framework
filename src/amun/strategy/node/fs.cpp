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

#include <QDateTime>
#include <QDir>
#include <QList>

#include <QDebug>

#include "v8.h"

using namespace v8;

FS::FS(Isolate* isolate) : Library(isolate) {
    HandleScope handleScope(m_isolate);

    Local<ObjectTemplate> objectTemplate = createObjectTemplateWithCallbacks({
        { "mkdirSync", &FS::mkdirSync },
        { "statSync", &FS::statSync },
        //{ "watchFile", &FS::watchFile },
        //{ "unwatchFile", &FS::unwatchFile },
        //{ "watch", &FS::watch },
        { "readFileSync", &FS::readFileSync },
        //{ "openSync", &FS::openSync },
        //{ "writeSync", &FS::writeSync },
        //{ "closeSync", &FS::closeSync },
        //{ "readdirSync", &FS::readdirSync },
        //{ "realpathSync", &FS::realpathSync },
        //{ "utimesSync", &FS::utimesSync },
        //{ "unlinkSync", &FS::unlinkSync }
    });

    Local<ObjectTemplate> fileStatTemplate = createObjectTemplateWithCallbacks({
            { "isDirectory", &FileStat::isDirectory },
            { "isFile", &FileStat::isFile }
    });
    fileStatTemplate->SetInternalFieldCount(1);
    fileStatTemplate->SetAccessor(String::NewFromUtf8(m_isolate, "size"), &FileStat::sizeGetter, &FileStat::sizeSetter);
    fileStatTemplate->SetAccessor(String::NewFromUtf8(m_isolate, "mtime"), &FileStat::mtimeGetter, &FileStat::mtimeSetter);
    m_fileStatTemplate.Reset(m_isolate, fileStatTemplate);

    setLibraryHandle(objectTemplate->NewInstance(m_isolate->GetCurrentContext()).ToLocalChecked());
}

FS::FileStat::FileStat(const FS* fs, const QString& info) {
    QFileInfo fileInfo(info);
    if (!fileInfo.exists()) {
        QString errorText = "file '";
        errorText += info;
        errorText += "' does not exist";
        fs->throwV8Exception(errorText);
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

void FS::FileStat::sizeGetter(Local<String> property, const PropertyCallbackInfo<Value>& info) {
    Local<Object> self = info.Holder();
    Local<External> wrap = Local<External>::Cast(self->GetInternalField(OBJECT_FILESTAT_INDEX));
    auto fileStat = static_cast<FileStat*>(wrap->Value());
    info.GetReturnValue().Set(fileStat->size);
}

void FS::FileStat::sizeSetter(Local<String> property, Local<Value> value, const PropertyCallbackInfo<void>& info) {
    Local<Object> self = info.Holder();
    Local<External> wrap = Local<External>::Cast(self->GetInternalField(OBJECT_FILESTAT_INDEX));
    auto fileStat = static_cast<FileStat*>(wrap->Value());
    fileStat->size = value->Int32Value();
}

void FS::FileStat::mtimeGetter(Local<String> property, const PropertyCallbackInfo<Value>& info) {
    Local<Object> self = info.Holder();
    Local<External> wrap = Local<External>::Cast(self->GetInternalField(OBJECT_FILESTAT_INDEX));
    auto fileStat = static_cast<FileStat*>(wrap->Value());
    info.GetReturnValue().Set(Date::New(info.GetIsolate(), fileStat->mtimeMs));
}

void FS::FileStat::mtimeSetter(Local<String> property, Local<Value> value, const PropertyCallbackInfo<void>& info) {
    Local<Object> self = info.Holder();
    Local<External> wrap = Local<External>::Cast(self->GetInternalField(OBJECT_FILESTAT_INDEX));
    auto fileStat = static_cast<FileStat*>(wrap->Value());
    fileStat->mtimeMs = value->NumberValue();
}

void FS::FileStat::isDirectory(const FunctionCallbackInfo<Value>& info) {
    Local<Object> self = info.Holder();
    Local<External> wrap = Local<External>::Cast(self->GetInternalField(OBJECT_FILESTAT_INDEX));
    auto fileStat = static_cast<FileStat*>(wrap->Value());
    info.GetReturnValue().Set(fileStat->type == FileStat::Type::Directory);
}

void FS::FileStat::isFile(const FunctionCallbackInfo<Value>& info) {
    Local<Object> self = info.Holder();
    Local<External> wrap = Local<External>::Cast(self->GetInternalField(OBJECT_FILESTAT_INDEX));
    auto fileStat = static_cast<FileStat*>(wrap->Value());
    info.GetReturnValue().Set(fileStat->type == FileStat::Type::File);
}

void FS::mkdirSync(const FunctionCallbackInfo<Value>& args) {
    auto fs = static_cast<FS*>(Local<External>::Cast(args.Data())->Value());
    if (args.Length() < 1 || !args[0]->IsString()) {
        fs->throwV8Exception("mkdirSync needs the first argument to be a string");
    }
    QString name = *String::Utf8Value(args[0]);
    QDir dir;
    dir.mkpath(name);
}

void FS::statSync(const FunctionCallbackInfo<Value>& args) {
    auto fs = static_cast<FS*>(Local<External>::Cast(args.Data())->Value());
    if (args.Length() < 1 || !args[0]->IsString()) {
        fs->throwV8Exception("statSync needs the first argument to be a string");
    }
    QString name = *String::Utf8Value(args[0]);

    auto isolate = fs->m_isolate;
    Local<ObjectTemplate> fileStatTemplate = fs->m_fileStatTemplate.Get(isolate);
    Local<Object> obj = fileStatTemplate->NewInstance(isolate->GetCurrentContext()).ToLocalChecked();
    obj->SetInternalField(OBJECT_FILESTAT_INDEX, External::New(isolate, new FileStat(fs, name)));

    args.GetReturnValue().Set(obj);
}

void FS::readFileSync(const FunctionCallbackInfo<Value>& args) {
    auto fs = static_cast<FS*>(Local<External>::Cast(args.Data())->Value());
    if (args.Length() < 1 || !args[0]->IsString()) {
        fs->throwV8Exception("readFileSync needs the first argument to be a string");
    }
}
