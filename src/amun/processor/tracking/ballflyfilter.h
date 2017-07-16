/***************************************************************************
 *   Copyright 2016 Alexander Danzer                                       *
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

#ifndef BALLFLYFILTER_H
#define BALLFLYFILTER_H

#include "abstractballfilter.h"
#include "quadraticleastsquaresfitter.h"
#include "protobuf/ssl_detection.pb.h"
#include "protobuf/world.pb.h"

struct ChipDetection{
    ChipDetection(float s, float as, float t, Eigen::Vector2f bp, Eigen::Vector2f dp,  float a, Eigen::Vector2f r, quint32 cid)
        :  dribblerSpeed(s), absSpeed(as), time(t), ballPos(bp), dribblerPos(dp), robotPos(r), cameraId(cid), ballArea(a)  {}
    ChipDetection(){} // make QVector happy
    float dribblerSpeed;
    float absSpeed;
    float time;
    Eigen::Vector2f ballPos;
    Eigen::Vector2f dribblerPos;
    Eigen::Vector2f robotPos;
    quint32 cameraId;
    float ballArea;
};

class FlyFilter : public AbstractBallFilter
{
public:
    explicit FlyFilter(VisionFrame& frame, CameraInfo* cameraInfo);
    FlyFilter(const FlyFilter &f, qint32 primaryCamera);

    void processVisionFrame(const VisionFrame& frame) override;
    bool acceptDetection(const VisionFrame& frame) override;
    void writeBallState(world::Ball *ball, qint64 predictionTime) override;
    float distToStartPos() { return m_distToStartPos; }

    bool isActive() { return m_isActive; }
    bool isBouncing() { return m_bouncing; }
    bool isShot();

private:
    bool m_shotDetected;
    bool m_chipDetected;
    bool m_isActive;
    QMap<int, world::BallPosition> m_lastRaw;

    struct PinvResult {
        float x0;
        float y0;
        float z0;
        float vx;
        float vy;
        float vz;
        float distStartPos;
        float vxControl;
        float vyControl;
        float refSpeed;
        Eigen::Vector2f intersection;
        Eigen::Vector2f intersectionGroundSpeed;
        float intersectionZSpeed;
        qint64 intersectionStartTime;
        float projToV;
        float camToV;
        float vControlDiff;
    };

    bool detectionCurviness(const PinvResult& pinvRes);
    bool detectionHeight();
    bool detectionSpeed();
    bool detectionPinv(const PinvResult &pinvRes);
    bool checkIsShot();
    unsigned numMeasurementsWithOwnCamera();
    Eigen::Vector3f unproject(const ChipDetection& detection, float ballRadius);

    PinvResult calcPinvAndIntersection();

    void approachPinvApply(const PinvResult& pinvRes);
    void approachIntersectApply(const PinvResult& pinvRes);
    bool approachAreaApply();

    bool approachPinvApplicable(const PinvResult& pinvRes);
    bool approachIntersectApplicable(const PinvResult& pinvRes);
    bool approachAreaApplicable();

    void parabolicFlightReconstruct(const PinvResult &pinvRes);
    void resetFlightReconstruction();

    struct Prediction {
        Prediction(const Eigen::Vector3f& p, const Eigen::Vector3f& s, double y) : pos(p), speed(s) {}
        Prediction(float x, float y, float z, float vx, float vy, float vz) :
            pos(Eigen::Vector3f(x,y,z)), speed(Eigen::Vector3f(vx,vy,vz)) {}
        Eigen::Vector3f pos;
        Eigen::Vector3f speed;
    };

    Prediction predictTrajectory(qint64 time);

    QVector<ChipDetection> m_shotDetectionWindow; // sliding window of size 5
    QVector<ChipDetection> m_kickFrames;

    Eigen::Vector2f m_chipStartPos;
    qint64 m_chipStartTime;
    Eigen::Vector2f m_groundSpeed;
    float m_zSpeed;
    float m_z0;

    Eigen::Vector2f m_touchdownPos;

    bool m_bouncing;
    qint64 m_bounceStartTime;
    float m_bounceZSpeed;
    Eigen::Vector2f m_bounceStartPos;
    Eigen::Vector2f m_bounceGroundSpeed;

    Eigen::Vector3f m_shotCamPos;
    int m_shotStartFrame;

    float m_distToStartPos;

    qint64 m_initTime;

    QuadraticLeastSquaresFitter m_flyFitter;

    int m_pinvDataInserted;
    Eigen::VectorXf m_d_detailed;
    Eigen::MatrixXf m_D_detailed;
    Eigen::VectorXf m_d_coarseControl;
    Eigen::MatrixXf m_D_coarseControl;

    bool collision();
    bool m_wasDetectedBefore;
    qint64 m_lastPredictionTime;
};

#endif // BALLFLYFILTER_H
