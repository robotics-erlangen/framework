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

#ifndef PATHDEBUG_H
#define PATHDEBUG_H

#include "protobuf/debug.pb.h"
#include "core/vector.h"
#include "boundingbox.h"
#include "alphatimetrajectory.h"
#include <QObject>
#include <QVector>
#include <QString>

enum class PathDebugColor {
    BLACK,
    RED,
    GREEN,
    BLUE,
    YELLOW,
    PURPLE,
    TURQUOISE
};

class PathDebug : public QObject
{
    Q_OBJECT
public:
#ifdef PATHFINDING_DEBUG
    void debug(const QString &key, float value);
    void debug(const QString &key, const QString &value);
    void debugCircle(const QString &name, Vector center, float radius, PathDebugColor color = PathDebugColor::BLACK);
    void debugPath(const QString &name, const std::vector<Vector> &points, PathDebugColor color = PathDebugColor::BLACK);
    void debugLine(const QString &name, Vector start, Vector end, PathDebugColor color = PathDebugColor::BLACK);
    void debugTrajectory(const QString &name, const SpeedProfile &trajectory, Vector offset, PathDebugColor color = PathDebugColor::BLACK);
    void debugBoundingBox(const QString &name, const BoundingBox &boundingBox, PathDebugColor color = PathDebugColor::BLACK);
#else
    void debug(const QString&, float) {}
    void debug(const QString&, const QString&) {}
    void debugCircle(const QString&, Vector, float, PathDebugColor = PathDebugColor::BLACK) {}
    void debugPath(const QString&, const QVector<Vector>&, PathDebugColor = PathDebugColor::BLACK) {}
    void debugLine(const QString&, Vector, Vector, PathDebugColor = PathDebugColor::BLACK) {}
    void debugTrajectory(const QString&, const SpeedProfile&, Vector, PathDebugColor = PathDebugColor::BLACK) {}
    void debugBoundingBox(const QString &, const BoundingBox &, PathDebugColor = PathDebugColor::BLACK) {}
#endif

signals:
    void gotDebug(const amun::DebugValue &debug);
    void gotVisualization(const amun::Visualization &vis);

private:
    void setColor(amun::Pen *pen, PathDebugColor color);
};

#endif // PATHDEBUG_H
