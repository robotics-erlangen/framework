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

#ifndef NODE_FS_H
#define NODE_FS_H

#include "library.h"
#include "v8.h"

#include <QFileInfo>

namespace Node {
    class FS : public Library {
    public:
        FS(v8::Isolate* isolate);
    private:
        class FileStat {
        public:
            FileStat(const FS* fs, const QString& file);
            static void sizeGetter(v8::Local<v8::String> property, const v8::PropertyCallbackInfo<v8::Value>& info);
            static void sizeSetter(v8::Local<v8::String> property, v8::Local<v8::Value> value,  const v8::PropertyCallbackInfo<void>& info);
            static void mtimeGetter(v8::Local<v8::String> property, const v8::PropertyCallbackInfo<v8::Value>& info);
            static void mtimeSetter(v8::Local<v8::String> property, v8::Local<v8::Value> value, const v8::PropertyCallbackInfo<void>& info);

            static void isDirectory(const v8::FunctionCallbackInfo<v8::Value>& info);
            static void isFile(const v8::FunctionCallbackInfo<v8::Value>& info);
            enum class Type {
                Directory, File, Other
            };
        private:
            double size, mtimeMs;
            Type type;
        };
        static const int OBJECT_FILESTAT_INDEX = 0;
        v8::Global<v8::ObjectTemplate> m_fileStatTemplate;

        static void mkdirSync(const v8::FunctionCallbackInfo<v8::Value>& args);
        static void statSync(const v8::FunctionCallbackInfo<v8::Value>& args);
        static void watchFile(const v8::FunctionCallbackInfo<v8::Value>& args);
        static void unwatchFile(const v8::FunctionCallbackInfo<v8::Value>& args);
        static void watch(const v8::FunctionCallbackInfo<v8::Value>& args);
        static void readFileSync(const v8::FunctionCallbackInfo<v8::Value>& args);
        static void openSync(const v8::FunctionCallbackInfo<v8::Value>& args);
        static void writeSync(const v8::FunctionCallbackInfo<v8::Value>& args);
        static void closeSync(const v8::FunctionCallbackInfo<v8::Value>& args);
        static void readdirSync(const v8::FunctionCallbackInfo<v8::Value>& args);
        static void realpathSync(const v8::FunctionCallbackInfo<v8::Value>& args);
        static void utimesSync(const v8::FunctionCallbackInfo<v8::Value>& args);
        static void unlinkSync(const v8::FunctionCallbackInfo<v8::Value>& args);
    };
}
#endif
