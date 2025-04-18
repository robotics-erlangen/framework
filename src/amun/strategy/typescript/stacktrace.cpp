/***************************************************************************
 *   Copyright 2025 Andreas Wendler, Tobias Heineken, Paul Bergmann        *
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

#include "stacktrace.h"

#include <QString>
#include <v8.h>

#include "typescriptsource.h"
#include "v8utility.h"

using namespace v8;
using namespace v8helper;

static MaybeLocal<Value> callFunction(const Local<Context>& c, QString& errorMsg, Local<Object>& object, const char* funName, Isolate* isolate, std::vector<Local<Value>>&& parameters = {})
{
    Local<String> funNameString = v8string(isolate, funName);
    Local<Value> functionValue = object->Get(c, funNameString).ToLocalChecked();
    Local<Function> fun = Local<Function>::Cast(functionValue);
    MaybeLocal<Value> maybeResult = fun->Call(c, object, parameters.size(), parameters.data());
    if (maybeResult.IsEmpty()) {
        errorMsg = errorMsg + "Calling " + funName + " did not result in a castable result! <br>";
    }
    return maybeResult;
}

static void evaluateStackFrame(const Local<Context>& c, QString& errorMsg, Local<Object> callSite)
{
    auto* isolate = c->GetIsolate();

    errorMsg += "at ";
    MaybeLocal<Value> funName = callFunction(c, errorMsg, callSite, "getFunctionName", isolate);
    String::Utf8Value funString(isolate, funName.ToLocalChecked());
    QString funQString(*funString);
    if (!callFunction(c, errorMsg, callSite, "isConstructor", isolate)
            .ToLocalChecked()
            ->BooleanValue(isolate)) {
        MaybeLocal<Value> toplevelOpt = callFunction(c, errorMsg, callSite, "isToplevel", isolate);
        if (!toplevelOpt.ToLocalChecked()->BooleanValue(isolate)) {
            //Find Typename
            MaybeLocal<Value> typeName = callFunction(c, errorMsg, callSite, "getTypeName", isolate);
            String::Utf8Value nameString(isolate, typeName.ToLocalChecked());
            errorMsg += QString(*nameString) + ".";
        }
        errorMsg += funQString;
        MaybeLocal<Value> methodName = callFunction(c, errorMsg, callSite, "getMethodName", isolate);

        Local<Value> methName = methodName.ToLocalChecked();
        if (!methName->IsNull()) {
            String::Utf8Value methString(isolate, methName);
            QString methQString(*methString);
            if (methQString != funQString) {
                errorMsg = errorMsg + " [as " + methQString + "]";
            }
        }
    } else {
        errorMsg += "new "+funQString;
    }

    MaybeLocal<Value> isEval = callFunction(c, errorMsg, callSite, "isEval", isolate);
    if (isEval.ToLocalChecked()->BooleanValue(isolate)) {
        MaybeLocal<Value> evalOrig = callFunction(c, errorMsg, callSite, "getEvalOrigin", isolate);
        String::Utf8Value evalOrigString(isolate, evalOrig.ToLocalChecked());
        errorMsg = errorMsg + " (" + QString(*evalOrigString) + ")<br>";
        return;
    }
    // No eval
    MaybeLocal<Value> fileName = callFunction(c, errorMsg, callSite, "getFileName", isolate);
    MaybeLocal<Value> lineNumber = callFunction(c, errorMsg, callSite, "getLineNumber", isolate);
    uint32_t lineUint = lineNumber.ToLocalChecked()->Uint32Value(c).ToChecked();
    MaybeLocal<Value> columnNumber = callFunction(c, errorMsg, callSite, "getColumnNumber", isolate);
    uint32_t columnUint = columnNumber.ToLocalChecked()->Uint32Value(c).ToChecked();
    String::Utf8Value fileString(isolate, fileName.ToLocalChecked());
    QString fileQString(*fileString);

    errorMsg += " (" + resolveJsToTs(fileQString, lineUint, columnUint) + ")<br>";
}

bool buildStackTrace(const Local<Context>& context, QString& errorMsg, const TryCatch& tryCatch)
{
    auto* isolate = context->GetIsolate();

    if (tryCatch.HasTerminated() || tryCatch.HasCaught()) {
        errorMsg = "<font color=\"red\">";
        Local<Message> checkMessage = tryCatch.Message();
        Local<Value> message = tryCatch.Exception();
        // When the strategy is beeing terminated by Script timeout,
        // there is no JS representation for this exception.
        // However, there is an exception so message.IsEmpty returns false.
        // To check that this is happening, we use checkMessage.
        // As .Message() returns the associated message to the exception,
        // which is not present if the exception does not have a JS representation,
        // this handle will be empty.
        if (!checkMessage.IsEmpty() || !message.IsEmpty()) {
            String::Utf8Value exception(isolate, message);
            QString exceptionString(*exception);
            exceptionString.replace("\n", "<br>");
            errorMsg += exceptionString + "<br>";
        } else {
            errorMsg += "has no message <br>";
        }
        Local<Value> stackTrace;
        if (tryCatch.StackTrace(context).ToLocal(&stackTrace)) {
            if (stackTrace->IsArray()) {
                Local<Array> stackArray = Local<Array>::Cast(stackTrace);
                for (uint32_t i = 0; i < stackArray->Length(); ++i) {
                    Local<Object> callSite = stackArray->Get(context, i).ToLocalChecked().As<Object>();
                    evaluateStackFrame(context, errorMsg, callSite);
                }
                errorMsg += "</font>";
            } else {
                // this will hapen when a strategy does not set Error.prepareStackTrace
                // this disables the option to use sourcemaps
                // we support it to avoid crashes when used with legacy strategy
                String::Utf8Value stringStack(isolate, stackTrace);
                QString exceptionString(*stringStack);
                exceptionString.replace("\n", "<br>");
                errorMsg = "<font color=\"red\">" + exceptionString + "</font>";
            }
        } else {
            // this will happen when an exception is created without an error object, i.e. throw "some error"
            if (!checkMessage.IsEmpty()) {
                String::Utf8Value exception(isolate, message);
                QString exceptionString(*exception);
                exceptionString.replace("\n", "<br>");
                errorMsg = "<font color=\"red\">" + exceptionString + "</font>";
            } else {
                // this will only happen if the script was terminated by CheckForScriptTimeout
                errorMsg = "<font color=\"red\">Script timeout</font>";
                return true;
            }
        }
    }
    return false;
}
