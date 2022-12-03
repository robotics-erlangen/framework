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

#include "pathdebug.h"

#ifdef PATHFINDING_DEBUG
void PathDebug::debug(const QString &key, float value)
{
    amun::DebugValue debugValue;
    const QByteArray array = key.toLocal8Bit();
    const char* k = array.data();
    debugValue.set_key(k);
    debugValue.set_float_value(value);
    emit gotDebug(debugValue);
}

void PathDebug::debug(const QString &key, const QString &value)
{
    amun::DebugValue debugValue;
    const QByteArray array = key.toLocal8Bit();
    const char* k = array.data();
    debugValue.set_key(k);
    debugValue.set_string_value(value.toStdString());
    emit gotDebug(debugValue);
}

void PathDebug::log(const QString &text)
{
    emit gotLog(text);
}

void PathDebug::setColor(amun::Pen *pen, PathDebugColor color)
{
    switch (color) {
    case PathDebugColor::BLACK:
        // do nothing
        break;
    case PathDebugColor::RED:
        pen->mutable_color()->set_red(255);
        break;
    case PathDebugColor::GREEN:
        pen->mutable_color()->set_green(255);
        break;
    case PathDebugColor::BLUE:
        pen->mutable_color()->set_blue(255);
        break;
    case PathDebugColor::YELLOW:
        pen->mutable_color()->set_red(255);
        pen->mutable_color()->set_green(255);
        break;
    case PathDebugColor::PURPLE:
        pen->mutable_color()->set_red(255);
        pen->mutable_color()->set_blue(255);
        break;
    case PathDebugColor::TURQUOISE:
        pen->mutable_color()->set_green(255);
        pen->mutable_color()->set_blue(255);
    case PathDebugColor::ORANGE:
        pen->mutable_color()->set_red(255);
        pen->mutable_color()->set_green(127);
        break;
    }
}

void PathDebug::debugCircle(const QString &name, Vector center, float radius, PathDebugColor color)
{
    amun::Visualization vis;
    vis.set_name(name.toStdString());
    amun::Circle *circle = vis.mutable_circle();
    circle->set_p_x(center.x);
    circle->set_p_y(center.y);
    circle->set_radius(radius);
    vis.mutable_brush();
    setColor(vis.mutable_pen(), color);
    emit gotVisualization(vis);
}

void PathDebug::debugPath(const QString &name, const std::vector<Vector> &points, PathDebugColor color)
{
    amun::Visualization vis;
    vis.set_name(name.toStdString().c_str());
    amun::Path *line = vis.mutable_path();
    for (Vector v : points) {
        amun::Point *p = line->add_point();
        p->set_x(v.x);
        p->set_y(v.y);
    }
    setColor(vis.mutable_pen(), color);
    emit gotVisualization(vis);
}

void PathDebug::debugLine(const QString &name, Vector start, Vector end, PathDebugColor color)
{
    amun::Visualization vis;
    vis.set_name(name.toStdString());
    amun::Path *line = vis.mutable_path();
    amun::Point *startPoint = line->add_point();
    startPoint->set_x(start.x);
    startPoint->set_y(start.y);

    amun::Point *endPoint = line->add_point();
    endPoint->set_x(end.x);
    endPoint->set_y(end.y);

    setColor(vis.mutable_pen(), color);
    emit gotVisualization(vis);
}

void PathDebug::debugTrajectory(const QString &name, const Trajectory &trajectory, PathDebugColor color)
{
    const int VIS_POINTS = 150;
    const float timeInterval = trajectory.time() / float(VIS_POINTS-1);

    const auto points = trajectory.trajectoryPositions(VIS_POINTS, timeInterval, 0);
    std::vector<Vector> positions;
    positions.reserve(points.size());
    for (const auto &point : points) {
        positions.push_back(point.state.pos);
    }
    debugPath(name, positions, color);
}

void PathDebug::debugBoundingBox(const QString &name, const BoundingBox &boundingBox, PathDebugColor color)
{
    std::vector<Vector> points(5);
    points[0] = {boundingBox.left, boundingBox.top};
    points[1] = {boundingBox.right, boundingBox.top};
    points[2] = {boundingBox.right, boundingBox.bottom};
    points[3] = {boundingBox.left, boundingBox.bottom};
    points[4] = {boundingBox.left, boundingBox.top};

    debugPath(name, points, color);
}
#endif
