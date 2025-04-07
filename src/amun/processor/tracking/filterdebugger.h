/***************************************************************************
 *   Copyright 2025 Alexander Danzer, Andreas Wendler, Paul Bergmann       *
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

#pragma once

#include "core/fieldtransform.h"
#include "protobuf/debug.pb.h"
#include <Eigen/Core>
#include <QString>
#include <QtGlobal>

class FilterDebugger
{
#ifdef ENABLE_TRACKING_DEBUG
public:
    FilterDebugger(qint32 primaryCamera, const FieldTransform& fieldTransform) :
        m_primaryCamera(primaryCamera),
        m_fieldTransform(fieldTransform)
    {}

    FilterDebugger(const FilterDebugger& debugger, qint32 newPrimaryCamera) :
        m_primaryCamera(newPrimaryCamera),
        m_fieldTransform(debugger.m_fieldTransform)
    {}

    const amun::DebugValues &debugValues() const { return m_debug; }
    void clearDebugValues() {
        m_debug.clear_value();
        m_debug.clear_visualization();
        m_debug.clear_log();
        m_debug.clear_plot();
    }

    void plot(const char* key, float value) const {
        auto *plot = m_debug.add_plot();
        plot->set_name(key);
        plot->set_value(value);
    }

    void addImage(const char *name, int resX, int resY, Eigen::Vector2f c1, Eigen::Vector2f c2, const std::vector<unsigned char> &data) const {
        amun::Visualization *vis = m_debug.add_visualization();
        vis->set_name(name);
        amun::ImageVisualization *image = vis->mutable_image();
        image->set_width(resX);
        image->set_height(resY);
        amun::Rectangle *area = image->mutable_draw_area();
        area->mutable_topleft()->set_x(c1.x());
        area->mutable_topleft()->set_y(c1.y());
        area->mutable_bottomright()->set_x(c2.x());
        area->mutable_bottomright()->set_y(c2.y());

        image->set_data(data.data(), data.size());
    }

    void addImage(const char *name, int resX, int resY, Eigen::Vector2f c1, Eigen::Vector2f c2, const std::function<std::array<int, 4>(Eigen::Vector2f)> &f) const {
        std::vector<unsigned char> data;
        data.reserve(resX * resY * 4);

        for (int y = 0;y<resY;y++) {
            for (int x = 0;x<resX;x++) {
                const float px = c1.x() + x * (c2.x() - c1.x()) / (resX - 1);
                const float py = c1.y() + y * (c2.y() - c1.y()) / (resY - 1);
                const auto values = f(Eigen::Vector2f(px, py));
                data.push_back(values[0]);
                data.push_back(values[1]);
                data.push_back(values[2]);
                data.push_back(values[3]);
            }
        }

        addImage(name, resX, resY, c1, c2, data);
    }

    void debug(const char* key, float value) const {
        amun::DebugValue *debugValue = m_debug.add_value();
        QByteArray array = (QString::number(m_primaryCamera)+QString("/")+QString(key)).toLocal8Bit();
        const char* k = array.data();
        debugValue->set_key(k);
        debugValue->set_float_value(value);
    }

    void debug(const QString key, const char* value) const {
        debug(key.toStdString().c_str(), value);
    }

    void debug(const QString key, float value) const {
        debug(key.toStdString().c_str(), value);
    }

    void debug(const char* key, const char* value) const {
        amun::DebugValue *debugValue = m_debug.add_value();
        QByteArray array = (QString::number(m_primaryCamera)+QString("/")+QString(key)).toLocal8Bit();
        const char* k = array.data();
        debugValue->set_key(k);
        debugValue->set_string_value(value);
    }

    void debugCircle(const char* name, float x, float y, float radius) const {
        amun::Visualization *vis = m_debug.add_visualization();
        vis->set_name(name);
        amun::Circle *circle = vis->mutable_circle();
        circle->set_p_x(m_fieldTransform.applyPosX(x, y));
        circle->set_p_y(m_fieldTransform.applyPosY(x, y));
        circle->set_radius(radius);
        vis->mutable_brush()->set_red(255);
        vis->mutable_brush()->set_blue(255);
    }

    void debugLine(const char* name, float xStart, float yStart, float xEnd, float yEnd, int col = 0) const {
        amun::Visualization *vis = m_debug.add_visualization();
        vis->set_name(name);
        amun::Path *line = vis->mutable_path();
        amun::Point *start = line->add_point();
        start->set_x(m_fieldTransform.applyPosX(xStart, yStart));
        start->set_y(m_fieldTransform.applyPosY(xStart, yStart));

        amun::Point *end = line->add_point();
        end->set_x(m_fieldTransform.applyPosX(xEnd, yEnd));
        end->set_y(m_fieldTransform.applyPosY(xEnd, yEnd));

        amun::Pen *pen = vis->mutable_pen();
        if (col==1) {
            pen->mutable_color()->set_green(255);
        } else if(col==2) {
            pen->mutable_color()->set_blue(255);
        } else if (col==3) {
            pen->mutable_color()->set_red(255);
            pen->mutable_color()->set_green(255);
        } else if(col==4) {
            pen->mutable_color()->set_red(255);
            pen->mutable_color()->set_blue(255);
        } else if(col==5) {
            pen->mutable_color()->set_green(255);
            pen->mutable_color()->set_blue(255);
        }else {
            pen->mutable_color()->set_red(255);
        }
    }

private:
    const qint32 m_primaryCamera;
    const FieldTransform& m_fieldTransform;
    mutable amun::DebugValues m_debug;

#else // ENABLE_TRACKING_DEBUG
public:
    FilterDebugger(qint32, const FieldTransform&) {}
    FilterDebugger(const FilterDebugger&, qint32) {}

    void addImage(const char *, int, int, Eigen::Vector2f, Eigen::Vector2f, const std::vector<unsigned char> &) {}
    void addImage(const char *, int, int, Eigen::Vector2f, Eigen::Vector2f, const std::function<std::array<int, 4>(Eigen::Vector2f)> &) {}
    void plot(const char* key, float value) const {}
    void debug(const char* key, float value) const {}
    void debug(const QString key, const char* value) const {}
    void debug(const QString key, float value) const {}
    void debug(const char* key, const char* value) const {}
    void debugCircle(const char* name, float x, float y, float radius) const {}
    void debugLine(const char* name, float xStart, float yStart, float xEnd, float yEnd, int col = 0) const {}
#endif // ENABLE_TRACKING_DEBUG
};
