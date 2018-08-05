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

using namespace v8;

// protobuf to js

static Local<Value> protobufFieldToJs(Isolate *isolate, const google::protobuf::Message &message, const google::protobuf::FieldDescriptor *field)
{
    const google::protobuf::Reflection *refl = message.GetReflection();
    if (!refl->HasField(message, field)) {
        return Undefined(isolate);
    }

    switch (field->cpp_type()) {
    case google::protobuf::FieldDescriptor::CPPTYPE_INT32:
        return Int32::New(isolate, refl->GetInt32(message, field));

    case google::protobuf::FieldDescriptor::CPPTYPE_INT64:
        // TODO: why can't v8 serialize BigInts???, fix
        return Number::New(isolate, refl->GetInt64(message, field));
        //return BigInt::New(isolate, refl->GetInt64(message, field));

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT32:
        return Uint32::NewFromUnsigned(isolate, refl->GetUInt32(message, field));

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT64:
        //return BigInt::NewFromUnsigned(isolate, refl->GetUInt64(message, field));
        return Number::New(isolate, refl->GetUInt64(message, field));

    case google::protobuf::FieldDescriptor::CPPTYPE_DOUBLE:
        return Number::New(isolate, refl->GetDouble(message, field));

    case google::protobuf::FieldDescriptor::CPPTYPE_FLOAT:
        return Number::New(isolate, double(refl->GetFloat(message, field)));

    case google::protobuf::FieldDescriptor::CPPTYPE_BOOL:
        return Boolean::New(isolate, refl->GetBool(message, field));

    case google::protobuf::FieldDescriptor::CPPTYPE_STRING:
        return String::NewFromUtf8(isolate, refl->GetString(message, field).c_str(),
                                   NewStringType::kNormal).ToLocalChecked();

    case google::protobuf::FieldDescriptor::CPPTYPE_ENUM:
        return String::NewFromUtf8(isolate, refl->GetEnum(message, field)->name().c_str(),
                                   NewStringType::kNormal).ToLocalChecked();

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
        //return BigInt::New(isolate, refl->GetRepeatedInt64(message, field, index));
        return Number::New(isolate, refl->GetRepeatedInt64(message, field, index));

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT32:
        return Uint32::NewFromUnsigned(isolate, refl->GetRepeatedUInt32(message, field, index));

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT64:
        //return BigInt::NewFromUnsigned(isolate, refl->GetRepeatedUInt64(message, field, index));
        return Number::New(isolate, refl->GetRepeatedUInt64(message, field, index));

    case google::protobuf::FieldDescriptor::CPPTYPE_DOUBLE:
        return Number::New(isolate, refl->GetRepeatedDouble(message, field, index));

    case google::protobuf::FieldDescriptor::CPPTYPE_FLOAT:
        return Number::New(isolate, double(refl->GetRepeatedFloat(message, field, index)));

    case google::protobuf::FieldDescriptor::CPPTYPE_BOOL:
        return Boolean::New(isolate, refl->GetRepeatedBool(message, field, index));

    case google::protobuf::FieldDescriptor::CPPTYPE_STRING:
        return String::NewFromUtf8(isolate, refl->GetRepeatedString(message, field, index).c_str(),
                                   NewStringType::kNormal).ToLocalChecked();

    case google::protobuf::FieldDescriptor::CPPTYPE_ENUM:
        return String::NewFromUtf8(isolate, refl->GetRepeatedEnum(message, field, index)->name().c_str(),
                                   NewStringType::kNormal).ToLocalChecked();

    case google::protobuf::FieldDescriptor::CPPTYPE_MESSAGE:
        return protobufToJs(isolate, refl->GetRepeatedMessage(message, field, index));
    }
    return Undefined(isolate);
}

Local<Value> protobufToJs(Isolate *isolate, const google::protobuf::Message &message)
{
    Local<Object> result = Object::New(isolate);

    // iterate over message fields
    for (int i = 0; i < message.GetDescriptor()->field_count(); i++) {
        const google::protobuf::FieldDescriptor *field = message.GetDescriptor()->field(i);

        Local<String> name = String::NewFromUtf8(isolate, field->name().c_str(),
                                                 NewStringType::kNormal).ToLocalChecked();
        if (field->is_repeated()) {
            const google::protobuf::Reflection *refl = message.GetReflection();
            Local<Array> array = Array::New(isolate, refl->FieldSize(message, field));
            for (int r = 0; r < refl->FieldSize(message, field); r++) {
                array->Set(r, repeatedFieldToJs(isolate, message, field, r));
            }
            result->Set(name, array);
        } else {
            result->Set(name, protobufFieldToJs(isolate, message, field));
        }
    }
    return result;
}


// js to protobuf

static void jsValueToProtobufField(Isolate *isolate, Local<Value> value, Local<Context> c, google::protobuf::Message &message, const google::protobuf::FieldDescriptor *field)
{
    const google::protobuf::Reflection *refl = message.GetReflection();

    // TODO: ra will crash when the type doesn't match
    switch (field->cpp_type()) {
    case google::protobuf::FieldDescriptor::CPPTYPE_INT32:
        refl->SetInt32(&message, field, value->Int32Value(c).ToChecked());
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_INT64:
        refl->SetInt64(&message, field, value->IntegerValue(c).ToChecked());
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT32:
        refl->SetUInt32(&message, field, value->Uint32Value(c).ToChecked());
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT64:
        // TODO: there seems to be no way to get an unsigned long from v8
        refl->SetUInt64(&message, field, (unsigned long)value->IntegerValue(c).ToChecked());
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_DOUBLE:
        refl->SetDouble(&message, field, value->NumberValue(c).ToChecked());
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_FLOAT:
        refl->SetFloat(&message, field, float(value->NumberValue(c).ToChecked()));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_BOOL:
        refl->SetBool(&message, field, value->BooleanValue(c).ToChecked());
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_STRING:
        refl->SetString(&message, field, *String::Utf8Value(value));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_ENUM:
    {
        char* str = *String::Utf8Value(value);
        const google::protobuf::EnumValueDescriptor *value = field->enum_type()->FindValueByName(str);
        if (value) {
            refl->SetEnum(&message, field, value);
        }
        break;
    }

    case google::protobuf::FieldDescriptor::CPPTYPE_MESSAGE:
        jsToProtobuf(isolate, value, c, *refl->MutableMessage(&message, field));
        break;
    }
}

static void jsValueToRepeatedProtobufField(Isolate *isolate, Local<Value> value, Local<Context> c, google::protobuf::Message &message, const google::protobuf::FieldDescriptor *field)
{
    const google::protobuf::Reflection *refl = message.GetReflection();

    // TODO: ra will crash when the type doesn't match
    switch (field->cpp_type()) {
    case google::protobuf::FieldDescriptor::CPPTYPE_INT32:
        refl->AddInt32(&message, field, value->Int32Value(c).ToChecked());
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_INT64:
        refl->AddInt64(&message, field, value->IntegerValue(c).ToChecked());
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT32:
        refl->AddUInt32(&message, field, value->Uint32Value(c).ToChecked());
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT64:
        // TODO: there seems to be no way to get an unsigned long from v8
        refl->AddUInt64(&message, field, (unsigned long)value->IntegerValue(c).ToChecked());
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_DOUBLE:
        refl->AddDouble(&message, field, value->NumberValue(c).ToChecked());
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_FLOAT:
        refl->AddFloat(&message, field, float(value->NumberValue(c).ToChecked()));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_BOOL:
        refl->AddBool(&message, field, value->BooleanValue(c).ToChecked());
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_STRING:
        refl->AddString(&message, field, *String::Utf8Value(value));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_ENUM:
    {
        char* str = *String::Utf8Value(value);
        const google::protobuf::EnumValueDescriptor *value = field->enum_type()->FindValueByName(str);
        if (value) {
            refl->AddEnum(&message, field, value);
        }
        break;
    }

    case google::protobuf::FieldDescriptor::CPPTYPE_MESSAGE:
        jsToProtobuf(isolate, value, c, *refl->AddMessage(&message, field));
        break;
    }
}

void jsToProtobuf(Isolate *isolate, Local<Value> value, Local<Context> c, google::protobuf::Message &message)
{
    // TODO: add error messages?

    Local<Object> object;
    if (!value->ToObject(c).ToLocal(&object)) {
        return;
    }

    // iterate over message fields
    for (int i = 0; i < message.GetDescriptor()->field_count(); i++) {
        const google::protobuf::FieldDescriptor *field = message.GetDescriptor()->field(i);

        // get value from table and check its existence
        Local<String> name = String::NewFromUtf8(isolate, field->name().c_str(), NewStringType::kNormal).ToLocalChecked();
        if (object->Has(c, name).ToChecked()) {
            Local<Value> v = object->Get(name);
            if (field->is_repeated()) {
                if (!v->IsArray()) {
                    continue;
                }
                Local<Array> array = Local<Array>::Cast(v);
                for (unsigned int j = 0;j<array->Length(); j++) {
                    jsValueToRepeatedProtobufField(isolate, array->Get(c, j).ToLocalChecked(), c, message, field);
                }
            } else {
                jsValueToProtobufField(isolate, v, c, message, field);
            }
        }
    }
}
