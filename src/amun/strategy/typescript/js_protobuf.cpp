/***************************************************************************
 *   Copyright 2018 Andreas Wendler                                        *
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

#include "js_protobuf.h"

#include <QDebug>

#include "v8utility.h"

using namespace v8;
using namespace v8helper;

// protobuf to js

// the field must be present in the message
static Local<Value> protobufFieldToJs(Isolate *isolate, const google::protobuf::Message &message, const google::protobuf::FieldDescriptor *field)
{
    const google::protobuf::Reflection *refl = message.GetReflection();

    switch (field->cpp_type()) {
    case google::protobuf::FieldDescriptor::CPPTYPE_INT32:
        return Int32::New(isolate, refl->GetInt32(message, field));

    case google::protobuf::FieldDescriptor::CPPTYPE_INT64:
        return Number::New(isolate, refl->GetInt64(message, field));

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT32:
        return Uint32::NewFromUnsigned(isolate, refl->GetUInt32(message, field));

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT64:
        return Number::New(isolate, refl->GetUInt64(message, field));

    case google::protobuf::FieldDescriptor::CPPTYPE_DOUBLE:
        return Number::New(isolate, refl->GetDouble(message, field));

    case google::protobuf::FieldDescriptor::CPPTYPE_FLOAT:
        return Number::New(isolate, double(refl->GetFloat(message, field)));

    case google::protobuf::FieldDescriptor::CPPTYPE_BOOL:
        return Boolean::New(isolate, refl->GetBool(message, field));

    case google::protobuf::FieldDescriptor::CPPTYPE_STRING:
        return v8string(isolate, refl->GetString(message, field));

    case google::protobuf::FieldDescriptor::CPPTYPE_ENUM:
        return v8string(isolate, refl->GetEnum(message, field)->name());

    case google::protobuf::FieldDescriptor::CPPTYPE_MESSAGE:
        return protobufToJs(isolate, refl->GetMessage(message, field));
    }
    return Undefined(isolate);
}

static Local<Value> repeatedFieldToJs(Isolate *isolate, const google::protobuf::Message &message, const google::protobuf::FieldDescriptor *field, int index)
{
    const google::protobuf::Reflection *refl = message.GetReflection();

    switch (field->cpp_type()) {
    case google::protobuf::FieldDescriptor::CPPTYPE_INT32:
        return Int32::New(isolate, refl->GetRepeatedInt32(message, field, index));

    case google::protobuf::FieldDescriptor::CPPTYPE_INT64:
        return Number::New(isolate, refl->GetRepeatedInt64(message, field, index));

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT32:
        return Uint32::NewFromUnsigned(isolate, refl->GetRepeatedUInt32(message, field, index));

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT64:
        return Number::New(isolate, refl->GetRepeatedUInt64(message, field, index));

    case google::protobuf::FieldDescriptor::CPPTYPE_DOUBLE:
        return Number::New(isolate, refl->GetRepeatedDouble(message, field, index));

    case google::protobuf::FieldDescriptor::CPPTYPE_FLOAT:
        return Number::New(isolate, double(refl->GetRepeatedFloat(message, field, index)));

    case google::protobuf::FieldDescriptor::CPPTYPE_BOOL:
        return Boolean::New(isolate, refl->GetRepeatedBool(message, field, index));

    case google::protobuf::FieldDescriptor::CPPTYPE_STRING:
        return v8string(isolate, refl->GetRepeatedString(message, field, index));

    case google::protobuf::FieldDescriptor::CPPTYPE_ENUM:
        return v8string(isolate, refl->GetRepeatedEnum(message, field, index)->name());

    case google::protobuf::FieldDescriptor::CPPTYPE_MESSAGE:
        return protobufToJs(isolate, refl->GetRepeatedMessage(message, field, index));
    default:
        // this case can currently not be entered, this is to handle future protobuf versions
        qDebug() <<"Unknown protobuf field type";
    }
    return Undefined(isolate);
}

Local<Value> protobufToJs(Isolate *isolate, const google::protobuf::Message &message)
{
    Local<Object> result = Object::New(isolate);
    Local<Context> context = isolate->GetCurrentContext();

    // iterate over message fields
    for (int i = 0; i < message.GetDescriptor()->field_count(); i++) {
        const google::protobuf::FieldDescriptor *field = message.GetDescriptor()->field(i);

        Local<String> name = v8string(isolate, field->name());
        if (field->is_repeated()) {
            const google::protobuf::Reflection *refl = message.GetReflection();
            int fieldSize = refl->FieldSize(message, field);
            Local<Array> array = Array::New(isolate, fieldSize);
            for (int r = 0; r < fieldSize; r++) {
                array->Set(context, r, repeatedFieldToJs(isolate, message, field, r)).Check();
            }
            result->Set(context, name, array).Check();
        } else {
            const google::protobuf::Reflection *refl = message.GetReflection();
            if (refl->HasField(message, field)) {
                result->Set(context, name, protobufFieldToJs(isolate, message, field)).Check();
            }
        }
    }
    return result;
}


// js to protobuf
static bool jsPartToProtobuf(Isolate *isolate, Local<Value> value, Local<Context> c, google::protobuf::Message &message);

// returns true iff the conversion was sucessfull
static bool jsValueToProtobufField(Isolate *isolate, Local<Value> value, Local<Context> c, google::protobuf::Message &message, const google::protobuf::FieldDescriptor *field)
{
    if (value->IsNullOrUndefined()) {
        return true;
    }
    const google::protobuf::Reflection *refl = message.GetReflection();


    if (field->type() == google::protobuf::FieldDescriptor::Type::TYPE_BYTES) {
        const Local<Uint8Array> data = Local<Uint8Array>::Cast(value);
        std::string ownValues(data->Length(), 1);
        data->CopyContents(ownValues.data(), ownValues.size());
        refl->SetString(&message, field, ownValues);
        return true;
    }

    switch (field->cpp_type()) {
    case google::protobuf::FieldDescriptor::CPPTYPE_INT32:
    {
        qint32 result;
        if (!value->Int32Value(c).To(&result)) {
            return false;
        }
        refl->SetInt32(&message, field, result);
        break;
    }

    case google::protobuf::FieldDescriptor::CPPTYPE_INT64:
    {
        int64_t result;
        if (!value->IntegerValue(c).To(&result)) {
            return false;
        }
        refl->SetInt64(&message, field, result);
        break;
    }

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT32:
    {
        quint32 result;
        if (!value->Uint32Value(c).To(&result)) {
            return false;
        }
        refl->SetUInt32(&message, field, result);
        break;
    }

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT64:
    {
        int64_t result;
        if (!value->IntegerValue(c).To(&result)) {
            return false;
        }
        refl->SetUInt64(&message, field, (quint64)result);
        break;
    }

    case google::protobuf::FieldDescriptor::CPPTYPE_DOUBLE:
    {
        double result;
        if (!value->NumberValue(c).To(&result)) {
            return false;
        }
        refl->SetDouble(&message, field, result);
        break;
    }

    case google::protobuf::FieldDescriptor::CPPTYPE_FLOAT:
    {
        double result;
        if (!value->NumberValue(c).To(&result)) {
            return false;
        }
        refl->SetFloat(&message, field, float(result));
        break;
    }

    case google::protobuf::FieldDescriptor::CPPTYPE_BOOL:
    {
        if (!value->IsBoolean()) {
            return false;
        }
        refl->SetBool(&message, field, value->BooleanValue(isolate));
        break;
    }

    case google::protobuf::FieldDescriptor::CPPTYPE_STRING:
        refl->SetString(&message, field, *String::Utf8Value(isolate, value));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_ENUM:
    {
        String::Utf8Value stringValue(isolate, value);
        const google::protobuf::EnumValueDescriptor *value = field->enum_type()->FindValueByName(*stringValue);
        if (value) {
            refl->SetEnum(&message, field, value);
        } else {
            return false;
        }
        break;
    }

    case google::protobuf::FieldDescriptor::CPPTYPE_MESSAGE:
        return jsPartToProtobuf(isolate, value, c, *refl->MutableMessage(&message, field));

    default:
        return false;
    }
    return true;
}

static bool jsValueToRepeatedProtobufField(Isolate *isolate, Local<Value> value, Local<Context> c, google::protobuf::Message &message, const google::protobuf::FieldDescriptor *field)
{
    const google::protobuf::Reflection *refl = message.GetReflection();

    switch (field->cpp_type()) {
    case google::protobuf::FieldDescriptor::CPPTYPE_INT32:
    {
        qint32 result;
        if (!value->Int32Value(c).To(&result)) {
            return false;
        }
        refl->AddInt32(&message, field, result);
        break;
    }

    case google::protobuf::FieldDescriptor::CPPTYPE_INT64:
    {
        int64_t result;
        if (!value->IntegerValue(c).To(&result)) {
            return false;
        }
        refl->AddInt64(&message, field, result);
        break;
    }

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT32:
    {
        quint32 result;
        if (!value->Uint32Value(c).To(&result)) {
            return false;
        }
        refl->AddUInt32(&message, field, result);
        break;
    }

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT64:
    {
        int64_t result;
        if (!value->IntegerValue(c).To(&result)) {
            return false;
        }
        refl->AddUInt64(&message, field, (quint64)result);
        break;
    }

    case google::protobuf::FieldDescriptor::CPPTYPE_DOUBLE:
    {
        double result;
        if (!value->NumberValue(c).To(&result)) {
            return false;
        }
        refl->AddDouble(&message, field, result);
        break;
    }

    case google::protobuf::FieldDescriptor::CPPTYPE_FLOAT:
    {
        double result;
        if (!value->NumberValue(c).To(&result)) {
            return false;
        }
        refl->AddFloat(&message, field, float(result));
        break;
    }

    case google::protobuf::FieldDescriptor::CPPTYPE_BOOL:
    {
        if (!value->IsBoolean()) {
            return false;
        }
        refl->AddBool(&message, field, value->BooleanValue(isolate));
        break;
    }

    case google::protobuf::FieldDescriptor::CPPTYPE_STRING:
        refl->AddString(&message, field, *String::Utf8Value(isolate, value));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_ENUM:
    {
        String::Utf8Value stringValue(isolate, value);
        const google::protobuf::EnumValueDescriptor *value = field->enum_type()->FindValueByName(*stringValue);
        if (value) {
            refl->AddEnum(&message, field, value);
        } else {
            return false;
        }
        break;
    }

    case google::protobuf::FieldDescriptor::CPPTYPE_MESSAGE:
        return jsPartToProtobuf(isolate, value, c, *refl->AddMessage(&message, field));

    default:
        return false;
    }
    return true;
}

static bool jsPartToProtobuf(Isolate *isolate, Local<Value> value, Local<Context> c, google::protobuf::Message &message)
{
    Local<Object> object;
    if (value->IsNullOrUndefined()) {
        return true;
    }
    if (!value->ToObject(c).ToLocal(&object)) {
        return false;
    }

    Local<Context> context = isolate->GetCurrentContext();

    // iterate over message fields
    for (int i = 0; i < message.GetDescriptor()->field_count(); i++) {
        const google::protobuf::FieldDescriptor *field = message.GetDescriptor()->field(i);

        // get value from table and check its existence
        Local<String> name = v8string(isolate, field->name());
        if (object->Has(c, name).ToChecked()) {
            Local<Value> v = object->Get(context, name).ToLocalChecked();
            if (field->is_repeated()) {
                if (!v->IsArray()) {
                    if (v->IsNullOrUndefined()) {
                        continue;
                    }
                    return false;
                }
                Local<Array> array = Local<Array>::Cast(v);
                for (unsigned int j = 0;j<array->Length(); j++) {
                    if (!jsValueToRepeatedProtobufField(isolate, array->Get(c, j).ToLocalChecked(), c, message, field)) {
                        return false;
                    }
                }
            } else {
                if (!jsValueToProtobufField(isolate, v, c, message, field)) {
                    return false;
                }
            }
        }
    }
    return true;
}

bool jsToProtobuf(Isolate *isolate, Local<Value> value, Local<Context> c, google::protobuf::Message &message)
{
    bool good = jsPartToProtobuf(isolate, value, c, message);
    if (!good) {
        isolate->ThrowException(Exception::Error(v8string(isolate, "Invalid object")));
        return false;
    }
    if (!message.IsInitialized()) {
        isolate->ThrowException(Exception::Error(v8string(isolate, "Invalid or incomplete object")));
        return false;
    }
    return true;
}
