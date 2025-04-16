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

#ifndef JS_PATH_H
#define JS_PATH_H

#include <memory>
#include <v8.h>

#include "path/abstractpath.h"
#include "path/path.h"
#include "path/trajectorypath.h"

class Typescript;

void registerPathJsCallbacks(v8::Isolate *isolate, v8::Local<v8::Object> global, Typescript *t);

/*! \brief Wrapper class that holds Path and TrajectoryPath objects (usually
 * only one of them at a time).
 *
 * Used to be a QObject, hence the name QTPath.
 */
class QTPath
{
public:
    QTPath(Typescript* t, std::unique_ptr<Path> path, std::unique_ptr<TrajectoryPath> trajectoryPath);

    Path *path() const { return p.get(); }
    AbstractPath *abstractPath() const { return p ? static_cast<AbstractPath*>(p.get()) : tp.get(); }
    TrajectoryPath *trajectoryPath() const { return tp.get(); }
    Typescript *typescript() const { return t; }

private:
    std::unique_ptr<Path> p;
    std::unique_ptr<TrajectoryPath> tp;
    Typescript *t;

};

#endif // JS_PATH_H
