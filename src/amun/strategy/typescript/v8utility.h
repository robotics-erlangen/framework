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
#include <functional>
#include <memory>
#include <utility>

template<class T> class QList;

namespace v8helper {
    namespace internal {
        template<typename T>
        struct PersistentHolder {
            PersistentHolder(T* ptr) : m_ptr(ptr) {}
            T* m_ptr;
            v8::Persistent<v8::External> m_v8handle;
        };

        template<typename T>
        void weakCallback2(const v8::WeakCallbackInfo<PersistentHolder<T>>& data)
        {
            PersistentHolder<T>* ptr = data.GetParameter();
            delete ptr->m_ptr;
            delete ptr;
        }

        template<typename T>
        void weakCallback(const v8::WeakCallbackInfo<PersistentHolder<T>>& data)
        {
            PersistentHolder<T>* ptr = data.GetParameter();
            ptr->m_v8handle.Reset();
            data.SetSecondPassCallback(weakCallback2<T>);
        }
    }

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

    /**
     * Embed a pointer into an external. The pointer will be free'd once the JS
     * GC collects the embedding JS object.
     *
     * To ensure that the C++-memory is freed, one has to call V8;s GC before
     * terminating the isolate. This needs the --expose-gc option in V8 to be
     * set.
     *
     * This reuses the callers HandleScope
     */
    template<typename T>
    v8::Local<v8::External> embedToExternal(v8::Isolate* isolate, std::unique_ptr<T> ptr)
    {
        auto released = ptr.release();
        auto holder = new internal::PersistentHolder<T>(released);
        {
            v8::HandleScope handleScope(isolate);
            holder->m_v8handle.Reset(isolate, v8::External::New(isolate, released));
        }
        holder->m_v8handle.SetWeak(holder, internal::weakCallback<T>, v8::WeakCallbackType::kParameter);
        return holder->m_v8handle.Get(isolate);
    }
}

#endif // V8UTILITY_H
