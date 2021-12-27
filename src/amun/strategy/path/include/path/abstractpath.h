/***************************************************************************
 *   Copyright 2019 Andreas Wendler                                        *
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

#ifndef ABSTRACTPATH_H
#define ABSTRACTPATH_H

#include "core/vector.h"
#include "protobuf/robot.pb.h"
#include "obstacles.h"
#include "worldinformation.h"
#include "pathdebug.h"
#include <QByteArray>
#include <QVector>
#include <QObject>

class RNG;

class AbstractPath : public QObject
{
    Q_OBJECT
public:
    AbstractPath(uint32_t rng_seed);
    virtual ~AbstractPath();
    AbstractPath(const AbstractPath&) = delete;
    AbstractPath& operator=(const AbstractPath&) = delete;
    virtual void reset() = 0;
    void seedRandom(uint32_t seed);
    WorldInformation &world() { return m_world; }
    const WorldInformation &world() const { return m_world; }

    void clearObstacles();
    virtual void clearObstaclesCustom() {}

signals:
    void gotDebug(const amun::DebugValue &debug);
    void gotLog(const QString &text);
    void gotVisualization(const amun::Visualization &vis);

protected:
    mutable RNG *m_rng; // allow using from const functions
    WorldInformation m_world;
    PathDebug m_debug;
};

#endif // ABSTRACTPATH_H
