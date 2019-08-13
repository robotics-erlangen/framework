/***************************************************************************
 *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

#include "lua_protobuf.h"
#include <google/protobuf/descriptor.h>
#include <type_traits>

static void pushField(lua_State *L, const google::protobuf::Message &message, const google::protobuf::FieldDescriptor *field)
{
    static_assert(sizeof(lua_Number) == 8, "expecting lua number to be a double");

    const google::protobuf::Reflection *refl = message.GetReflection();
    if (!refl->HasField(message, field)) {
        lua_pushnil(L);
        return;
    }

    switch (field->cpp_type()) {
    case google::protobuf::FieldDescriptor::CPPTYPE_INT32:
        lua_pushinteger(L, refl->GetInt32(message, field));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_INT64:
        lua_pushnumber(L, refl->GetInt64(message, field));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT32:
        lua_pushinteger(L, refl->GetUInt32(message, field));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT64:
        lua_pushnumber(L, refl->GetUInt64(message, field));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_DOUBLE:
        lua_pushnumber(L, refl->GetDouble(message, field));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_FLOAT:
        lua_pushnumber(L, refl->GetFloat(message, field));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_BOOL:
        lua_pushboolean(L, refl->GetBool(message, field));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_STRING:
        lua_pushstring(L, refl->GetString(message, field).c_str());
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_ENUM:
        lua_pushstring(L, refl->GetEnum(message, field)->name().c_str());
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_MESSAGE:
        protobufPushMessage(L, refl->GetMessage(message, field));
        break;

    default:
        lua_pushnil(L);
    }
}

static void pushRepeatedField(lua_State *L, const google::protobuf::Message &message, const google::protobuf::FieldDescriptor *field, int index)
{
    const google::protobuf::Reflection *refl = message.GetReflection();

    switch (field->cpp_type()) {
    case google::protobuf::FieldDescriptor::CPPTYPE_INT32:
        lua_pushinteger(L, refl->GetRepeatedInt32(message, field, index));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_INT64:
        lua_pushnumber(L, refl->GetRepeatedInt64(message, field, index));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT32:
        lua_pushinteger(L, refl->GetRepeatedUInt32(message, field, index));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT64:
        lua_pushnumber(L, refl->GetRepeatedUInt64(message, field, index));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_DOUBLE:
        lua_pushnumber(L, refl->GetRepeatedDouble(message, field, index));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_FLOAT:
        lua_pushnumber(L, refl->GetRepeatedFloat(message, field, index));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_BOOL:
        lua_pushboolean(L, refl->GetRepeatedBool(message, field, index));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_STRING:
        lua_pushstring(L, refl->GetRepeatedString(message, field, index).c_str());
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_ENUM:
        lua_pushstring(L, refl->GetRepeatedEnum(message, field, index)->name().c_str());
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_MESSAGE:
        protobufPushMessage(L, refl->GetRepeatedMessage(message, field, index));
        break;

    default:
        lua_pushnil(L);
    }
}

// translate protobuf message to lua table
void protobufPushMessage(lua_State *L, const google::protobuf::Message &message)
{
    lua_createtable(L, 0, message.GetDescriptor()->field_count());

    // iterate over message fields
    for (int i = 0; i < message.GetDescriptor()->field_count(); i++) {
        const google::protobuf::FieldDescriptor *field = message.GetDescriptor()->field(i);

        if (field->is_repeated()) {
            const google::protobuf::Reflection *refl = message.GetReflection();
            lua_createtable(L, refl->FieldSize(message, field), 0);
            for (int r = 0; r < refl->FieldSize(message, field); r++) {
                lua_pushinteger(L, r + 1);
                pushRepeatedField(L, message, field, r);
                lua_settable(L, -3);
            }
        } else {
            pushField(L, message, field);
        }

        lua_setfield(L, -2, field->name().c_str());
    }
    // leaves new table on lua stack
}

static void toField(lua_State *L, google::protobuf::Message &message, const google::protobuf::FieldDescriptor *field, std::string *errorMessage)
{
    const google::protobuf::Reflection *refl = message.GetReflection();
    const char *str;

    switch (field->cpp_type()) {
    case google::protobuf::FieldDescriptor::CPPTYPE_INT32:
        refl->SetInt32(&message, field, lua_tointeger(L, -1));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_INT64:
        refl->SetInt64(&message, field, lua_tointeger(L, -1));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT32:
        refl->SetUInt32(&message, field, lua_tointeger(L, -1));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT64:
        refl->SetUInt64(&message, field, lua_tointeger(L, -1));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_DOUBLE:
        refl->SetDouble(&message, field, lua_tonumber(L, -1));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_FLOAT:
        refl->SetFloat(&message, field, lua_tonumber(L, -1));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_BOOL:
        refl->SetBool(&message, field, lua_toboolean(L, -1));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_STRING:
        str = lua_tostring(L, -1);
        if (str != NULL) {
            refl->SetString(&message, field, str);
        }
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_ENUM:
        str = lua_tostring(L, -1);
        if (str != NULL) {
            const google::protobuf::EnumValueDescriptor *value = field->enum_type()->FindValueByName(str);
            if (value) {
                refl->SetEnum(&message, field, value);
            }
        }
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_MESSAGE:
        protobufToMessage(L, -1, *refl->MutableMessage(&message, field), errorMessage);
        break;
    }
}

static void toRepeatedField(lua_State *L, google::protobuf::Message &message, const google::protobuf::FieldDescriptor *field, std::string *errorMessage)
{
    const google::protobuf::Reflection *refl = message.GetReflection();
    const char *str;

    switch (field->cpp_type()) {
    case google::protobuf::FieldDescriptor::CPPTYPE_INT32:
        refl->AddInt32(&message, field, lua_tointeger(L, -1));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_INT64:
        refl->AddInt64(&message, field, lua_tointeger(L, -1));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT32:
        refl->AddUInt32(&message, field, lua_tointeger(L, -1));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_UINT64:
        refl->AddUInt64(&message, field, lua_tointeger(L, -1));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_DOUBLE:
        refl->AddDouble(&message, field, lua_tonumber(L, -1));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_FLOAT:
        refl->AddFloat(&message, field, lua_tonumber(L, -1));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_BOOL:
        refl->AddBool(&message, field, lua_toboolean(L, -1));
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_STRING:
        str = lua_tostring(L, -1);
        // prevent null pointers
        if (str != NULL) {
            refl->AddString(&message, field, str);
        }
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_ENUM:
        str = lua_tostring(L, -1);
        if (str != NULL) {
            const google::protobuf::EnumValueDescriptor *value = field->enum_type()->FindValueByName(str);
            if (value) {
                refl->AddEnum(&message, field, value);
            }
        }
        break;

    case google::protobuf::FieldDescriptor::CPPTYPE_MESSAGE:
        protobufToMessage(L, -1, *refl->AddMessage(&message, field), errorMessage);
        break;
    }
}

// translate lua table to protobuf message
void protobufToMessage(lua_State *L, int index, google::protobuf::Message &message, std::string * errorMessage)
{
    // iterate over message fields
    for (int i = 0; i < message.GetDescriptor()->field_count(); i++) {
        const google::protobuf::FieldDescriptor *field = message.GetDescriptor()->field(i);

        // get value from table and check its existence
        lua_getfield(L, index, field->name().c_str());
        if (!lua_isnil(L, -1)) {
            if (field->is_repeated()) {
                for (int j = 1; ; j++) {
                    lua_pushinteger(L, j);
                    lua_gettable(L, -2);

                    if (!lua_isnil(L, -1)) {
                        toRepeatedField(L, message, field, errorMessage);
                        lua_pop(L, 1);
                    } else {
                        lua_pop(L, 1);
                        break;
                    }
                }
            } else {
                toField(L, message, field, errorMessage);
            }
        }
        lua_pop(L, 1);
    }

    // ensure protobuf message is valid
    if (!message.IsInitialized()) {
        if (errorMessage == nullptr) {
            luaL_error(L, "One or more required fields are not set: %s", message.InitializationErrorString().c_str());
        } else {
            *errorMessage += "One or more required fields are not set: " + message.InitializationErrorString();
        }
    }
}
