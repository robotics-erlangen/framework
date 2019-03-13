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

#include <algorithm>
#include <cstdint>
#include <memory>
#include <QByteArray>
#include <QStringList>
#include <QDateTime>
#include <QDir>
#include <QFile>
#include <QList>
#include <QString>
#include <string>
#include "v8.h"
#include <vector>

using v8::BigInt;
using v8::Array;
using v8::Date;
using v8::External;
using v8::Function;
using v8::FunctionCallbackInfo;
using v8::Integer;
using v8::HandleScope;
using v8::Isolate;
using v8::Local;
using v8::NewStringType;
using v8::Number;
using v8::Object;
using v8::ObjectTemplate;
using v8::PropertyCallbackInfo;
using v8::String;
using v8::Value;

Node::fs::fs(Isolate* isolate, const ObjectContainer* requireNamespace) : ObjectContainer(isolate, requireNamespace) {
    HandleScope handleScope(m_isolate);

    auto objectTemplate = createTemplateWithCallbacks<ObjectTemplate>({
        { "mkdirSync", &fs::mkdirSync },
        { "statSync", &fs::statSync },
        //{ "watchFile", &fs::watchFile },
        //{ "unwatchFile", &fs::unwatchFile },
        //{ "watch", &fs::watch },
        { "readFileSync", &fs::readFileSync },
        { "openSync", &fs::openSync },
        { "writeSync", &fs::writeSync },
        { "closeSync", &fs::closeSync },
        { "readdirSync", &fs::readdirSync },
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

std::shared_ptr<QFile> Node::fs::extractFD(Local<Number> fdAsNumber) {
    double fdAsDouble = fdAsNumber->Value();
    // wtf
    QFile* fdRaw = *reinterpret_cast<QFile**>(&fdAsDouble);
    auto fdIt = std::find_if(m_fileDescriptors.begin(), m_fileDescriptors.end(),
            [fdRaw](const std::shared_ptr<QFile>& val) { return val.get() == fdRaw; });
    if (fdIt == m_fileDescriptors.end()) {
        return std::shared_ptr<QFile>();
    }
    return *fdIt;
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

#include <QDebug>
void Node::fs::openSync(const v8::FunctionCallbackInfo<Value>& args) {
    auto isolate = args.GetIsolate();
    auto fs = static_cast<Node::fs*>(Local<External>::Cast(args.Data())->Value());
    if (args.Length() < 1 || !args[0]->IsString()) {
        fs->throwV8Exception("openSync needs the first argument to be a string");
        return;
    } else if (args.Length() > 2) {
        fs->throwV8Exception("openSync with more than 2 arguments is not supported");
        return;
    }
    QString fileName = *String::Utf8Value(args[0]);
    QFile file(fileName);

    QString modeString = args.Length() >= 2 ? *String::Utf8Value(args[1]) : "r";
    QIODevice::OpenMode mode;
    if (modeString == "a") {
        mode = QIODevice::Append;
   /* } else if (modeString == "ax") {
        mode = QIODevice::Append | QIODevice::NewOnly;*/
    } else if (modeString == "a+") {
        mode = QIODevice::ReadOnly | QIODevice::Append;
   /* } else if (modeString == "ax+") {
        mode = QIODevice::ReadOnly | QIODevice::Append | QIODevice::NewOnly; */
    } else if (modeString == "as") {
        mode = QIODevice::Append | QIODevice::Unbuffered;
    } else if (modeString == "as+") {
        mode = QIODevice::ReadOnly | QIODevice::Append | QIODevice::Unbuffered;
    } else if (modeString == "r") {
        mode = QIODevice::ReadOnly;
    } else if (modeString == "r+") {
        mode = QIODevice::ReadWrite;
    } else if (modeString == "rs+") {
        mode = QIODevice::ReadWrite | QIODevice::Unbuffered;
    } else if (modeString == "w") {
        mode = QIODevice::WriteOnly;
   /* } else if (modeString == "wx") {
        mode = QIODevice::WriteOnly | QIODevice::NewOnly;*/
    } else if (modeString == "w+") {
        mode = QIODevice::ReadWrite;
   /* } else if (modeString == "wx+") {
        mode = QIODevice::ReadWrite | QIODevice::NewOnly; */
    } else {
        fs->throwV8Exception(QString("openSync called with invalid mode flag '%1'").arg(mode));
        return;
    }

    std::shared_ptr<QFile> fileHandle = std::make_shared<QFile>(fileName);
    if (!fileHandle->open(mode)) {
        fs->throwV8Exception(QString("openSync could not open file '%1' because of '%2'").arg(fileName).arg(fileHandle->errorString()));
        return;
    }

    QFile* fd = fileHandle.get();
    fs->m_fileDescriptors.push_back(fileHandle);

    Local<Number> fdAsNumber = Number::New(isolate, *reinterpret_cast<double*>(&fd));
    args.GetReturnValue().Set(fdAsNumber);
}

void Node::fs::writeSync(const v8::FunctionCallbackInfo<Value>& args) {
    auto isolate = args.GetIsolate();
    auto fs = static_cast<Node::fs*>(Local<External>::Cast(args.Data())->Value());
    if (args.Length() < 2) {
        fs->throwV8Exception("writeSync needs at least 2 arguments");
        return;
    } else if (!args[0]->IsNumber()) {
        fs->throwV8Exception("writeSync needs the first argument to be a number");
        return;
    }
    // TODO check if used with buffer or string

    std::shared_ptr<QFile> fd = fs->extractFD(args[0].As<Number>());
    if (!fd) {
        fs->throwV8Exception("writeSync called with invalid file descriptor");
        return;
    }

    if ((fd->openMode() & QIODevice::WriteOnly) == 0 && (fd->openMode() & QIODevice::Append) == 0) {
        fs->throwV8Exception("writeSync called on file not opened for writing or appending");
        return;
    }

    if (args.Length() >= 3 && args[2]->IsNumber()) {
        qint64 position = args[2].As<Number>()->Value();
        if (!fd->seek(position)) {
            fs->throwV8Exception(QString("Could not seek to position %1: %2").arg(position).arg(fd->errorString()));
            return;
        }
    }

    QString encoding = args.Length() >= 4 && args[3]->IsString() ? *String::Utf8Value(args[3]) : "utf8";

    Local<String> stringArg = args[1].As<String>();
    // WriteOneByte seems to want to write a 0 Byte
    // But we dont need it so we don't add 1 to the length
    QByteArray tempHolder(stringArg->Length(), '\0');
    stringArg->WriteOneByte(isolate, (unsigned char*) tempHolder.data(), 0, tempHolder.length());

    QByteArray dataHolder;
    if (encoding == "base64") {
        // this won't handle url encoded strings correctly
        // node would
        dataHolder = QByteArray::fromBase64(std::move(tempHolder));
    } else if (encoding == "hex") {
        dataHolder = QByteArray::fromHex(std::move(tempHolder));
    } else {
        dataHolder = std::move(tempHolder);
    }

    qint64 bytesWritten = fd->write(dataHolder);
    if (bytesWritten < 0) {
        fs->throwV8Exception(QString("writeSync write error occured: %1").arg(fd->errorString()));
        return;
    }
    // this will break if you write more than 4GiB at once
    args.GetReturnValue().Set(static_cast<qint32>(bytesWritten));
}

void Node::fs::closeSync(const v8::FunctionCallbackInfo<Value>& args) {
    auto fs = static_cast<Node::fs*>(Local<External>::Cast(args.Data())->Value());
    if (args.Length() != 1 || !args[0]->IsNumber()) {
        fs->throwV8Exception("closeSync needs exactly one number argument");
        return;
    }
    std::shared_ptr<QFile> fd = fs->extractFD(args[0].As<Number>());
    if (!fd) {
        fs->throwV8Exception("closeSync called with invalid file descriptor");
        return;
    }

    fd->close();
    fs->m_fileDescriptors.erase(std::remove(fs->m_fileDescriptors.begin(), fs->m_fileDescriptors.end(), fd));
}

void Node::fs::readdirSync(const v8::FunctionCallbackInfo<v8::Value>& args) {
    auto isolate = args.GetIsolate();
    auto fs = static_cast<Node::fs*>(Local<External>::Cast(args.Data())->Value());
    if (args.Length() != 1 || !args[0]->IsString()) {
        fs->throwV8Exception("readdirSync needs exactly 1 string argument");
        return;
    }

    QString path = *String::Utf8Value(isolate, args[0].As<String>());
    QDir dir(path);

    if (!dir.exists()) {
        fs->throwV8Exception(QString("directory '%1' does not exist").arg(path));
        return;
    }

    QStringList entries = dir.entryList(QDir::AllEntries | QDir::NoDotAndDotDot);
    Local<Array> result = Array::New(isolate, entries.length());
    for (int i = 0; i < entries.length(); ++i) {
        const QString& entry = entries[i];
        Local<String> entryConverted = String::NewFromUtf8(isolate, entry.toUtf8().data(), NewStringType::kNormal).ToLocalChecked();
        result->Set(i, entryConverted);
    }
    args.GetReturnValue().Set(result);
}
