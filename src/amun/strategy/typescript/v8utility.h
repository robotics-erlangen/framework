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

#ifndef V8UTILITY_H
#define V8UTILITY_H

#include "v8.h"

template<class T> class QList;

namespace std {
    template <typename T> class function;
}

namespace v8helper {

    /**
      * Convert a C++ to a V8 string.
      * Using this with QT StringTypes (QString, QByteArray) is preferred over
      * std::string since these are implicitly shared and the function takes its
      * input string by value.
      * This is implemented for
      * - QString
      * - QByteArray
      * - std::string
      * - const char *
      */
    template<typename StringType>
    v8::Local<v8::String> v8string(v8::Isolate* isolate, StringType str);

    template<typename StringType>
    void throwError(v8::Isolate* isolate, StringType text);

    struct CallbackInfo {
        const char *name;
        void (*function)(const v8::FunctionCallbackInfo<v8::Value>&);
    };

    using CallbackDataMapper = std::function<v8::Local<v8::Value>(const CallbackInfo&)>;
    template<typename Target>
    v8::Local<Target> installCallbacks(v8::Isolate* isolate, v8::Local<Target> target, const QList<CallbackInfo>& callbacks, const CallbackDataMapper& dataMapper);
    template<typename Target>
    v8::Local<Target> installCallbacks(v8::Isolate* isolate, v8::Local<Target> target, const QList<CallbackInfo>& callbacks, v8::Local<v8::Value> data);

    template<typename TargetType>
    v8::Local<TargetType> createWithCallbacks(v8::Isolate* isolate, const QList<CallbackInfo>& callbacks, v8::Local<v8::Value> data);

}

#endif // V8UTILITY_H
