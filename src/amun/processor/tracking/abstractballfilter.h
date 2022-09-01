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
    VisionFrame(const SSL_DetectionBall& b, qint64 t, qint32 c, RobotInfo r, qint64 vPT, qint64 captureTime)
        : cameraId(c), ballArea(b.area()), x(-b.y()/1000), y(b.x()/1000), time(t), captureTime(captureTime),
          robot(r), visionProcessingTime(vPT) {}
    // b.area is optional in the protobuf but defaults to 0, so nothing bad can happen
    qint32 cameraId;
    quint32 ballArea;
    float x;
    float y;
    qint64 time;
    qint64 captureTime;
    RobotInfo robot;
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
    virtual int chooseDetection(const std::vector<VisionFrame>& frames) const =0;
    virtual void writeBallState(world::Ball *ball, qint64 predictionTime, const QVector<RobotInfo> &robots, qint64 lastCameraFrameTime)=0;

    // camera id is necessary for debugging
    void moveToCamera(qint32 primaryCamera) {
        m_primaryCamera = primaryCamera;
    }

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
    AbstractBallFilter(const VisionFrame& frame, CameraInfo* cameraInfo, const FieldTransform &transform, const world::BallModel &ballModel) :
        m_cameraInfo(cameraInfo),
        m_primaryCamera(frame.cameraId),
        m_fieldTransform(transform),
        m_ballModel(ballModel)
    {}

    // create a copy of the filter in a different camera for border crossing
    AbstractBallFilter(const AbstractBallFilter& filter, qint32 primaryCamera) :
        m_cameraInfo(filter.m_cameraInfo),
        m_primaryCamera(primaryCamera),
        m_fieldTransform(filter.m_fieldTransform),
        m_ballModel(filter.m_ballModel)
    {}

    virtual ~AbstractBallFilter() {}

    CameraInfo* m_cameraInfo;
    int m_primaryCamera;
    const FieldTransform &m_fieldTransform;
    const world::BallModel &m_ballModel;

#ifdef ENABLE_TRACKING_DEBUG
    mutable amun::DebugValues m_debug;
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
    void debugLine(const char* name, float xStart, float yStart, float xEnd, float yEnd, int col=0) const {
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
    void addImage(const char *, int, int, Eigen::Vector2f, Eigen::Vector2f, const std::vector<unsigned char> &) const {}
    void addImage(const char *, int, int, Eigen::Vector2f, Eigen::Vector2f, const std::function<std::array<int, 4>(Eigen::Vector2f)> &) const {}
    void plot(const char* key, float value) const {}
    void debug(const char* key, float value) const {}
    void debug(const QString key, const char* value) const {}
    void debug(const QString key, float value) const {}
    void debug(const char* key, const char* value) const {}
    void debugCircle(const char* name, float x, float y, float radius) const {}
    void debugLine(const char* name, float xStart, float yStart, float xEnd, float yEnd, int col=0) const {}
#endif

};

#endif // ABSTRACTBALLFILTER_H
