/***************************************************************************
 *   Copyright 2019 Paul Bergmann                                          *
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

#include "v8utility.h"

#include <QByteArray>
#include <QString>
#include <string>
#include "v8.h"

using namespace v8;

namespace v8helper {

template<>
Local<String> v8string(Isolate* isolate, const char* str)
{
    return String::NewFromUtf8(isolate, str, NewStringType::kNormal).ToLocalChecked();
}

template<>
Local<String> v8string(Isolate* isolate, std::string str)
{
    return String::NewFromUtf8(isolate, str.c_str(), NewStringType::kNormal, str.length()).ToLocalChecked();
}

template<>
Local<String> v8string(Isolate* isolate, QByteArray str)
{
    return String::NewFromUtf8(isolate, str.data(), NewStringType::kNormal, str.length()).ToLocalChecked();
}

template<>
Local<String> v8string(Isolate* isolate, QString str)
{
    return v8string(isolate, str.toUtf8());
}

}

