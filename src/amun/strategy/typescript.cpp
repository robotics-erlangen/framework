#include "typescript.h"

#include <QFileInfo>
#include <QTextStream>
#include <QDebug>

#include "v8.h"
#include "libplatform/libplatform.h"

using namespace v8;

// TODO: factor most of these information out
Typescript::Typescript(const Timer *timer, StrategyType type, bool debugEnabled, bool refboxControlEnabled)
{
    Isolate::CreateParams create_params;
    create_params.array_buffer_allocator = ArrayBuffer::Allocator::NewDefaultAllocator();
    m_isolate = Isolate::New(create_params);
    m_isolate->Enter();

    HandleScope handleScope(m_isolate);
    Local<Context> context = Context::New(m_isolate);
    m_context.Reset(m_isolate, context);

    // TODO: alle v8:: entfernen
}

Typescript::~Typescript()
{
    // TODO: delete objects
    //m_context.Reset();
    //m_isolate->Dispose();
}

bool Typescript::canHandle(const QString &filename)
{
    QFileInfo file(filename);
    // TODO: js is only for temporary tests
    return file.fileName().split(".").last() == "js";
}

AbstractStrategyScript* Typescript::createStrategy(const Timer *timer, StrategyType type, bool debugEnabled, bool refboxControlEnabled)
{
    return new Typescript(timer, type, debugEnabled, refboxControlEnabled);
}

bool Typescript::loadScript(const QString &filename, const QString &entryPoint, const world::Geometry &geometry, const robot::Team &team)
{
    QFile file(filename);
    if (file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        QTextStream in(&file);
        QString content = in.readAll();
        QByteArray contentBytes = content.toLatin1();

        HandleScope handleScope(m_isolate);
        Local<Context> context = Local<Context>::New(m_isolate, m_context);
        Context::Scope contextScope(context);

        Local<String> source = String::NewFromUtf8(m_isolate,
                                            contentBytes.data(), v8::NewStringType::kNormal).ToLocalChecked();

        // Compile the source code.
        Local<Script> script;
        TryCatch tryCatch(m_isolate);
        if (!Script::Compile(context, source).ToLocal(&script)) {
            String::Utf8Value error(m_isolate, tryCatch.Exception());
            m_errorMsg = "<font color=\"red\">" + QString(*error) + "</font>";
            return false;
        }

        // execute the script once to get entrypoints etc.
        // TODO: handle run-time errors
        MaybeLocal<Value> maybeResult = script->Run(context);
        Local<Value> result;
        if (!maybeResult.ToLocal(&result)) {
            // the script returns nothing
            m_errorMsg = "<font color=\"red\">No entrypoints defined!</font>";
            return false;
        }

        if (!result->IsObject()) {
            m_errorMsg = "<font color=\"red\">Script doesn't return an object!</font>";
            return false;
        }

        Local<Object> resultObject = result->ToObject(context).ToLocalChecked();
        Local<String> nameString = String::NewFromUtf8(m_isolate, "name", NewStringType::kNormal).ToLocalChecked();
        Local<String> entrypointsString = String::NewFromUtf8(m_isolate, "entrypoints", NewStringType::kNormal).ToLocalChecked();
        if (!resultObject->Has(nameString) || !resultObject->Has(entrypointsString)) {
            m_errorMsg = "<font color=\"red\">Script must return object containing 'name' and 'entrypoints'!</font>";
            return false;
        }

        Local<Value> maybeName = resultObject->Get(nameString);
        if (!maybeName->IsString()) {
            m_errorMsg = "<font color=\"red\">Script name must be a string!</font>";
            return false;
        }
        Local<String> name = maybeName->ToString(context).ToLocalChecked();
        m_name = QString(*String::Utf8Value(name));
        // TODO: get options from strategy

        Local<Value> maybeEntryPoints = resultObject->Get(entrypointsString);
        if (!maybeEntryPoints->IsObject()) {
            m_errorMsg = "<font color=\"red\">Entrypoints must be an object!</font>";
            return false;
        }

        m_entryPoints.clear();
        QMap<QString, Local<Function>> entryPoints;
        Local<Object> entrypointsObject = maybeEntryPoints->ToObject(context).ToLocalChecked();
        Local<Array> properties = entrypointsObject->GetOwnPropertyNames();
        for (unsigned int i = 0;i<properties->Length();i++) {
            Local<Value> key = properties->Get(i);
            Local<Value> value = entrypointsObject->Get(key);
            if (!value->IsFunction()) {
                m_errorMsg = "<font color=\"red\">Entrypoints must contain functions!</font>";
                return false;
            }
            Local<Function> function = Local<Function>::Cast(value);

            QString keyString(*String::Utf8Value(key));
            m_entryPoints.append(keyString);
            entryPoints[keyString] = function;
        }

        if (!chooseEntryPoint(entryPoint)) {
            return false;
        }

        m_function.Reset(m_isolate, entryPoints[m_entryPoint]);
        return true;
    } else {
        m_errorMsg = "<font color=\"red\">Could not open file " + filename + "</font>";
        return false;
    }
}

bool Typescript::process(double &pathPlanning, const world::State &worldState, const amun::GameState &refereeState, const amun::UserInput &userInput)
{
    HandleScope handleScope(m_isolate);
    Local<Context> context = Local<Context>::New(m_isolate, m_context);
    Context::Scope contextScope(context);

    // TODO: handle run-time errors
    Local<Function> function = Local<Function>::New(m_isolate, m_function);
    MaybeLocal<Value> result = function->Call(context, context->Global(), 0, nullptr);

    return true;
}
