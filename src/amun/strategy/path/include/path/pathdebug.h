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
    TURQUOISE,
    ORANGE
};

class PathDebug : public QObject
{
    Q_OBJECT
public:
#ifdef PATHFINDING_DEBUG
    void debug(const QString &key, float value);
    void debug(const QString &key, const QString &value);
    void log(const QString &text);
    void debugCircle(const QString &name, Vector center, float radius, PathDebugColor color = PathDebugColor::BLACK);
    void debugPath(const QString &name, const std::vector<Vector> &points, PathDebugColor color = PathDebugColor::BLACK);
    void debugLine(const QString &name, Vector start, Vector end, PathDebugColor color = PathDebugColor::BLACK);
    void debugTrajectory(const QString &name, const Trajectory &trajectory, PathDebugColor color = PathDebugColor::BLACK);
    void debugBoundingBox(const QString &name, const BoundingBox &boundingBox, PathDebugColor color = PathDebugColor::BLACK);
    void addImage(const char *name, int resX, int resY, Vector c1, Vector c2, const std::vector<unsigned char> &data)
    {
        amun::Visualization vis;
        vis.set_name(name);
        amun::ImageVisualization *image = vis.mutable_image();
        image->set_width(resX);
        image->set_height(resY);
        amun::Rectangle *area = image->mutable_draw_area();
        area->mutable_topleft()->set_x(c1.x);
        area->mutable_topleft()->set_y(c1.y);
        area->mutable_bottomright()->set_x(c2.x);
        area->mutable_bottomright()->set_y(c2.y);

        image->set_data(data.data(), data.size());
        emit gotVisualization(vis);
    }
    void addImage(const char *name, int resX, int resY, Vector c1, Vector c2, const std::function<std::array<int, 4>(Vector)> &f)
    {
        std::vector<unsigned char> data;
        data.reserve(resX * resY * 4);

        for (int y = 0;y<resY;y++) {
            for (int x = 0;x<resX;x++) {
                const float px = c1.x + x * (c2.x - c1.x) / (resX - 1);
                const float py = c1.y + y * (c2.y - c1.y) / (resY - 1);
                const auto values = f(Vector(px, py));
                data.push_back(values[0]);
                data.push_back(values[1]);
                data.push_back(values[2]);
                data.push_back(values[3]);
            }
        }

        addImage(name, resX, resY, c1, c2, data);
    }
#else
    void debug(const QString&, float) {}
    void debug(const QString&, const QString&) {}
    void log(const QString&) {}
    void debugCircle(const QString&, Vector, float, PathDebugColor = PathDebugColor::BLACK) {}
    void debugPath(const QString&, const QVector<Vector>&, PathDebugColor = PathDebugColor::BLACK) {}
    void debugLine(const QString&, Vector, Vector, PathDebugColor = PathDebugColor::BLACK) {}
    void debugTrajectory(const QString&, const Trajectory&, Vector, PathDebugColor = PathDebugColor::BLACK) {}
    void debugBoundingBox(const QString &, const BoundingBox &, PathDebugColor = PathDebugColor::BLACK) {}
#endif

signals:
    void gotDebug(const amun::DebugValue &debug);
    void gotVisualization(const amun::Visualization &vis);
    void gotLog(const QString &text);

private:
    void setColor(amun::Pen *pen, PathDebugColor color);
};

#endif // PATHDEBUG_H
