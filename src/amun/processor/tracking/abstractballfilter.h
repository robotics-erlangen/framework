#ifndef ABSTRACTBALLFILTER_H
#define ABSTRACTBALLFILTER_H

#include "protobuf/ssl_detection.pb.h"
#include "protobuf/debug.pb.h"
#include "protobuf/world.pb.h"
#include "kalmanfilter.h"

#include <QList>
#include <QMap>
#include <QString>

struct RobotInfo {
    Eigen::Vector2f robotPos;
    Eigen::Vector2f dribblerPos;
    bool chipCommand;
    bool linearCommand;
};

struct VisionFrame
{
    // rotate position and convert to meter
    VisionFrame(const SSL_DetectionBall& b, qint64 t, qint32 c, RobotInfo r, qint64 vPT)
        : cameraId(c), ballArea(b.area()), x(-b.y()/1000), y(b.x()/1000), time(t), dribblerPos(r.dribblerPos), robotPos(r.robotPos), chipCommand(r.chipCommand), linearCommand(r.linearCommand), visionProcessingTime(vPT) {}
    // b.area is optional in the protobuf but defaults to 0, so nothing bad can happen
    qint32 cameraId;
    quint32 ballArea;
    float x;
    float y;
    qint64 time;
    Eigen::Vector2f dribblerPos;
    Eigen::Vector2f robotPos;
    bool chipCommand;
    bool linearCommand;
    qint64 visionProcessingTime;
};

struct CameraInfo {
    // index for the map is cameraId
    QMap<int, Eigen::Vector3f> cameraPosition;
    QMap<int, float> focalLength;
};

typedef KalmanFilter<6, 3> Kalman;

class AbstractBallFilter {
public:
    AbstractBallFilter(VisionFrame& frame, CameraInfo& cameraInfo);

    virtual void processVisionFrame(VisionFrame const& frame)=0;
    virtual bool acceptDetection(const VisionFrame& frame)=0;
    virtual void writeBallState(world::Ball *ball, qint64 predictionTime)=0;
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
    AbstractBallFilter() {}
    virtual ~AbstractBallFilter(){}
    CameraInfo* m_cameraInfo;
    int m_primaryCamera;

#ifdef ENABLE_TRACKING_DEBUG
    amun::DebugValues m_debug;
    void debug(const char* key, float value){
        amun::DebugValue *debugValue = m_debug.add_value();
        QByteArray array = (QString::number(m_primaryCamera)+QString("/")+QString(key)).toLocal8Bit();
        const char* k = array.data();
        debugValue->set_key(k);
        debugValue->set_float_value(value);
    }
    void debug(const QString key, const char* value){
        debug(key.toStdString().c_str(), value);
    }
    void debug(const QString key, float value){
        debug(key.toStdString().c_str(), value);
    }
    void debug(const char* key, const char* value){
        amun::DebugValue *debugValue = m_debug.add_value();
        QByteArray array = (QString::number(m_primaryCamera)+QString("/")+QString(key)).toLocal8Bit();
        const char* k = array.data();
        debugValue->set_key(k);
        debugValue->set_string_value(value);
    }
    void debugCircle(const char* name, float x, float y, float radius){
        amun::Visualization *vis = m_debug.add_visualization();
        vis->set_name(name);
        amun::Circle *circle = vis->mutable_circle();
        circle->set_p_x(x);
        circle->set_p_y(y);
        circle->set_radius(radius);
        vis->mutable_brush();
    }
    void debugLine(const char* name, float xStart, float yStart, float xEnd, float yEnd, int col=0){
        amun::Visualization *vis = m_debug.add_visualization();
        vis->set_name(name);
        amun::Path *line = vis->mutable_path();
        amun::Point *start = line->add_point();
        start->set_x(xStart);
        start->set_y(yStart);

        amun::Point *end = line->add_point();
        end->set_x(xEnd);
        end->set_y(yEnd);

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
