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
#include "protobuf/ssl_detection.pb.h"
#include "protobuf/world.pb.h"

#include <optional>

class FlyFilter : public AbstractBallFilter
{
public:
    explicit FlyFilter(const VisionFrame& frame, CameraInfo* cameraInfo, const FieldTransform &transform, const world::BallModel &ballModel);
    FlyFilter(const FlyFilter &filter) = default;

    void processVisionFrame(const VisionFrame& frame) override;
    int chooseDetection(const std::vector<VisionFrame>& frames) const override;
    void writeBallState(world::Ball *ball, qint64 predictionTime, const QVector<RobotInfo> &robots, qint64 lastCameraFrameTime) override;
    float distToStartPos() { return m_distToStartPos; }

    bool isActive() const;

private:
    enum ShootCommand {
        NONE = 0,
        LINEAR = 1,
        CHIP = 2,
        BOTH = 3
    };

    struct ChipDetection {
        ChipDetection(float s, float as, float t, float ct, Eigen::Vector2f bp, Eigen::Vector2f dp, Eigen::Vector2f r, quint32 cid, ShootCommand sc, int rid)
            :  dribblerSpeed(s), absSpeed(as), time(t), captureTime(ct), ballPos(bp), dribblerPos(dp), robotPos(r), robotId(rid), cameraId(cid), shootCommand(sc)  {}
        ChipDetection(){} // make QVector happy

        float dribblerSpeed;
        float absSpeed;
        float time; // in seconds since init of filter
        float captureTime; // seconds since init of filter
        Eigen::Vector2f ballPos;
        Eigen::Vector2f dribblerPos;
        Eigen::Vector2f robotPos;
        int robotId;
        quint32 cameraId;
        ShootCommand shootCommand;
    };

    // can be used for the initial chip, but also while bouncing
    struct BallFlight {
        Eigen::Vector2f flightStartPos;
        float flightStartTime; // seconds
        float captureFlightStartTime; // the start time on the vision pc
        Eigen::Vector2f groundSpeed;
        float zSpeed; // at the flight start time
        int startFrame; // the first frame in m_kickFrames that this flight uses
        float reconstructionError; // the specifics might vary with the reconstruction method

        bool hasBounced(float time) const;
        // returns the estimated flight that will occur after the next bounce
        BallFlight afterBounce(int newStartFrame, const world::BallModel &ballModel) const;
        Eigen::Vector2f touchdownPos() const;
        static BallFlight betweenChipFrames(const ChipDetection &first, const ChipDetection &last, int startFrame);
    };

    ChipDetection createChipDetection(const VisionFrame& frame) const;
    float toLocalTime(qint64 time) const; // returns a result in seconds, relative to the initialization of the filter

    bool detectionSpeed() const;
    bool detectionPinv(const BallFlight &pinvRes) const;
    bool detectChip(const BallFlight &pinvRes) const;

    bool checkIsShot() const;
    bool checkIsDribbling() const;
    bool collision() const;
    unsigned numMeasurementsWithOwnCamera() const;

    std::optional<BallFlight> calcPinv();

    Eigen::Vector2f approxGroundDirection() const;
    BallFlight constrainedReconstruction(Eigen::Vector2f shotStartPos, Eigen::Vector2f groundSpeed, float startTime, int startFrame) const;

    BallFlight approachShotDirectionApply() const;

    bool approachPinvApplicable(const BallFlight &pinvRes) const;
    bool approachShotDirectionApplicable(const BallFlight &reconstruction) const;

    std::optional<BallFlight> parabolicFlightReconstruct(const BallFlight &pinvRes) const;
    void resetFlightReconstruction();

    float chipShotError(const BallFlight &pinvRes) const;
    float linearShotError() const;

    struct Prediction {
        Prediction(Eigen::Vector2f pos2, float z, Eigen::Vector2f speed2, float vz, Eigen::Vector2f touchdown) :
            pos(Eigen::Vector3f(pos2.x(),pos2.y(),z)), speed(Eigen::Vector3f(speed2.x(),speed2.y(),vz)), touchdownPos(touchdown) {}

        Eigen::Vector3f pos;
        Eigen::Vector3f speed;
        Eigen::Vector2f touchdownPos;
    };

    int detectBouncing();
    void updateBouncing(qint64 time);
    Prediction predictTrajectory(float time) const;

private:
    qint64 m_initTime;

    bool m_chipDetected;

    int m_shotStartFrame;
    QVector<ChipDetection> m_shotDetectionWindow; // sliding window
    QVector<ChipDetection> m_kickFrames;
    ShootCommand m_shootCommand;

    // the initial flight, bounces are added as they happen
    // if the flight could not be reconstructed, it will be empty
    QVector<BallFlight> m_flightReconstructions;
    // not an assumed bounce by timing, but only the last one determined by vision detections
    int m_lastBounceFrame;

    float m_distToStartPos;

    float m_biasStrength;
    int m_pinvDataInserted;
    Eigen::VectorXf m_d_detailed;
    Eigen::MatrixXf m_D_detailed;
};

#endif // BALLFLYFILTER_H
