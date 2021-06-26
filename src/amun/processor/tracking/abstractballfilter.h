/***************************************************************************
 *   Copyright 2020 Alexander Danzer, Andreas Wendler                      *
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

#ifndef ABSTRACTBALLFILTER_H
#define ABSTRACTBALLFILTER_H

#include "protobuf/ssl_detection.pb.h"
#include "protobuf/debug.pb.h"
#include "protobuf/world.pb.h"
#include "kalmanfilter.h"
#include "robotfilter.h"

#include <QList>
#include <QMap>
#include <QString>
#include <QVector>

struct VisionFrame
{
    // rotate position and convert to meter
    VisionFrame(const SSL_DetectionBall& b, qint64 t, qint32 c, RobotInfo r, qint64 vPT)
        : cameraId(c), ballArea(b.area()), x(-b.y()/1000), y(b.x()/1000), time(t), robot(r), chipCommand(r.chipCommand), linearCommand(r.linearCommand), visionProcessingTime(vPT) {}
    // b.area is optional in the protobuf but defaults to 0, so nothing bad can happen
    qint32 cameraId;
    quint32 ballArea;
    float x;
    float y;
    qint64 time;
    RobotInfo robot;
    bool chipCommand;
    bool linearCommand;
    qint64 visionProcessingTime;
};

struct CameraInfo {
    // index for the map is cameraId
    QMap<int, Eigen::Vector3f> cameraPosition;
    QMap<int, float> focalLength;
    QMap<int, QString> cameraSender;
};

typedef KalmanFilter<6, 3> Kalman;

class AbstractBallFilter {
public:
    AbstractBallFilter(const AbstractBallFilter&) = default;
    AbstractBallFilter(AbstractBallFilter&&) = delete;
    AbstractBallFilter& operator=(const AbstractBallFilter&) = delete;
    AbstractBallFilter& operator=(AbstractBallFilter&&) = delete;

    virtual void processVisionFrame(VisionFrame const& frame)=0;
    virtual bool acceptDetection(const VisionFrame& frame)=0;
    virtual void writeBallState(world::Ball *ball, qint64 predictionTime, const QVector<RobotInfo> &robots)=0;
    // this function is called when multiple mutually exclusive balls are available. Return the id of the best matching visionframe
    virtual std::size_t chooseBall(const std::vector<VisionFrame> &frames) { return 0; }

#ifdef ENABLE_TRACKING_DEBUG
    virtual const amun::DebugValues &debugValues() const { return m_debug; }
    virtual void clearDebugValues() {
        m_debug.clear_value();
        m_debug.clear_visualization();
        m_debug.clear_log();
        m_debug.clear_plot();
    }
#endif

protected:
    // initial filter construction
    AbstractBallFilter(const VisionFrame& frame, CameraInfo* cameraInfo, const FieldTransform &transform) :
        m_cameraInfo(cameraInfo), m_primaryCamera(frame.cameraId), m_fieldTransform(transform) {}

    // create a copy of the filter in a different camera for border crossing
    AbstractBallFilter(const AbstractBallFilter& filter, qint32 primaryCamera) :
        m_cameraInfo(filter.m_cameraInfo), m_primaryCamera(primaryCamera), m_fieldTransform(filter.m_fieldTransform) {}

    virtual ~AbstractBallFilter() {}


    CameraInfo* m_cameraInfo;
    int m_primaryCamera;
    const FieldTransform &m_fieldTransform;

#ifdef ENABLE_TRACKING_DEBUG
    amun::DebugValues m_debug;
    void plot(const char* key, float value) {
        auto *plot = m_debug.add_plot();
        plot->set_name(key);
        plot->set_value(value);
    }
    void debug(const char* key, float value) {
        amun::DebugValue *debugValue = m_debug.add_value();
        QByteArray array = (QString::number(m_primaryCamera)+QString("/")+QString(key)).toLocal8Bit();
        const char* k = array.data();
        debugValue->set_key(k);
        debugValue->set_float_value(value);
    }
    void debug(const QString key, const char* value) {
        debug(key.toStdString().c_str(), value);
    }
    void debug(const QString key, float value) {
        debug(key.toStdString().c_str(), value);
    }
    void debug(const char* key, const char* value) {
        amun::DebugValue *debugValue = m_debug.add_value();
        QByteArray array = (QString::number(m_primaryCamera)+QString("/")+QString(key)).toLocal8Bit();
        const char* k = array.data();
        debugValue->set_key(k);
        debugValue->set_string_value(value);
    }
    void debugCircle(const char* name, float x, float y, float radius) {
        amun::Visualization *vis = m_debug.add_visualization();
        vis->set_name(name);
        amun::Circle *circle = vis->mutable_circle();
        circle->set_p_x(m_fieldTransform.applyPosX(x, y));
        circle->set_p_y(m_fieldTransform.applyPosY(x, y));
        circle->set_radius(radius);
        vis->mutable_brush()->set_red(255);
        vis->mutable_brush()->set_blue(255);
    }
    void debugLine(const char* name, float xStart, float yStart, float xEnd, float yEnd, int col=0) {
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
#else
    void debug(const char* key, float value) const {}
    void debug(const QString key, const char* value) const {}
    void debug(const QString key, float value) const {}
    void debug(const char* key, const char* value) const {}
    void debugCircle(const char* name, float x, float y, float radius) const {}
    void debugLine(const char* name, float xStart, float yStart, float xEnd, float yEnd, int col=0) const {}
#endif

};

#endif // ABSTRACTBALLFILTER_H
