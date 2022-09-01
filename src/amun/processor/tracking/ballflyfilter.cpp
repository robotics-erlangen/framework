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

#include "ballflyfilter.h"
#include <cmath>
#include <numeric>
#include <iostream>
#include <Eigen/Core>
#include <Eigen/SVD>
#include <QDebug>

static const int MAX_FRAMES_PER_FLIGHT = 200; // 60Hz, 3 seconds in the air
static const int ADDITIONAL_DATA_INSERTION = 1; // these additional are for the position bias
static const float INITIAL_BIAS_STRENGTH = 0.1f;
static const float GRAVITY = 9.81;

FlyFilter::FlyFilter(const VisionFrame& frame, CameraInfo* cameraInfo, const FieldTransform &transform, const world::BallModel &ballModel) :
    AbstractBallFilter(frame, cameraInfo, transform, ballModel),
    m_initTime(frame.time)
{
    resetFlightReconstruction();
}

bool FlyFilter::isActive() const
{
    return !m_flightReconstructions.isEmpty();
}

bool FlyFilter::checkIsShot() const
{
    if (m_shotDetectionWindow.size() < 4) {
        return false;
    }

    const int b = m_shotDetectionWindow.size() - 4;
    const float dist = (m_shotDetectionWindow.at(b + 1).ballPos - m_shotDetectionWindow.at(b + 3).ballPos).norm();
    const float timeDiff = m_shotDetectionWindow.at(b + 3).time - m_shotDetectionWindow.at(b + 1).time;
    const float absSpeed = dist / timeDiff;

    const float dribblerDist0 = (m_shotDetectionWindow.at(b + 0).dribblerPos - m_shotDetectionWindow.at(b + 0).ballPos).norm();
    const float dribblerDist1 = (m_shotDetectionWindow.at(b + 0).dribblerPos - m_shotDetectionWindow.at(b + 1).ballPos).norm();
    const float dribblerDist2 = (m_shotDetectionWindow.at(b + 0).dribblerPos - m_shotDetectionWindow.at(b + 2).ballPos).norm();
    const float dribblerDist3 = (m_shotDetectionWindow.at(b + 0).dribblerPos - m_shotDetectionWindow.at(b + 3).ballPos).norm();

    const bool distanceMonotonicRising = dribblerDist0 < dribblerDist1 && dribblerDist1 < dribblerDist2 && dribblerDist2 < dribblerDist3;

    return m_shotDetectionWindow.at(b + 1).dribblerSpeed > m_shotDetectionWindow.at(b + 0).dribblerSpeed
            && m_shotDetectionWindow.at(b + 1).dribblerSpeed > 0.1f
            && absSpeed > 1
            && m_shotDetectionWindow.at(b + 1).absSpeed - m_shotDetectionWindow.at(b + 0).absSpeed > 0.2f
            && distanceMonotonicRising
            // moved at least 6cm
            && dribblerDist3 - dribblerDist0 > 0.06f
            // initial ball pos close to dribbler
            && dribblerDist0 < 0.1f;
}

unsigned FlyFilter::numMeasurementsWithOwnCamera() const
{
    int num = 0;
    for (int i=0; i<m_kickFrames.size(); i++) {
        if (m_kickFrames.at(i).cameraId == m_kickFrames.back().cameraId) {
            num++;
        }
    }
    return num;
}

bool FlyFilter::collision() const
{
    if (m_kickFrames.size() <= 5) {
        return false;
    }
    const auto& first = m_kickFrames.at(m_kickFrames.size()-3);
    const auto& second = m_kickFrames.at(m_kickFrames.size()-2);
    const auto& third = m_kickFrames.at(m_kickFrames.size()-1);

    const float angle = std::abs(atan2(first.ballPos(1)-second.ballPos(1), first.ballPos(0)-second.ballPos(0))
            - atan2(third.ballPos(1)-second.ballPos(1), third.ballPos(0)-second.ballPos(0)));

    const float robotDist = (m_kickFrames.back().ballPos - m_kickFrames.back().robotPos).norm();
    const float height = m_flightReconstructions.isEmpty() ? 0.0f : predictTrajectory(m_kickFrames.back().time).pos.z();
    return (angle < 0.86*M_PI || angle > 1.14*M_PI) && height < 0.15f && robotDist < 0.18f;
}

auto FlyFilter::calcPinv() -> std::optional<BallFlight>
{
    const ChipDetection firstInTheAir = m_kickFrames.at(m_shotStartFrame);

    if (m_pinvDataInserted == 0) {
        m_pinvDataInserted = m_shotStartFrame-1;
    }
    for (int i=m_pinvDataInserted+1; i<m_kickFrames.size(); i++) {
        const Eigen::Vector3f cam = m_cameraInfo->cameraPosition.value(m_kickFrames.at(i).cameraId);
        const float t_i = m_kickFrames.at(i).captureTime - firstInTheAir.captureTime;
        const float x = m_kickFrames.at(i).ballPos(0);
        const float y = m_kickFrames.at(i).ballPos(1);
        const float alpha = (x-cam(0)) / cam(2);
        const float beta = (y-cam(1)) / cam(2);

        const int baseIndex = (i + ADDITIONAL_DATA_INSERTION) * 2;
        m_D_detailed(baseIndex, 0) = alpha;
        m_D_detailed(baseIndex, 1) = alpha*t_i;
        m_D_detailed(baseIndex, 2) = 1;
        m_D_detailed(baseIndex, 3) = t_i;
        m_D_detailed(baseIndex, 4) = 0;
        m_D_detailed(baseIndex, 5) = 0;
        m_d_detailed(baseIndex) = 0.5*GRAVITY*alpha*t_i*t_i + x;

        m_D_detailed(baseIndex + 1, 0) = beta;
        m_D_detailed(baseIndex + 1, 1) = beta*t_i;
        m_D_detailed(baseIndex + 1, 2) = 0;
        m_D_detailed(baseIndex + 1, 3) = 0;
        m_D_detailed(baseIndex + 1, 4) = 1;
        m_D_detailed(baseIndex + 1, 5) = t_i;
        m_d_detailed(baseIndex + 1) = 0.5*GRAVITY*beta*t_i*t_i + y;
        m_pinvDataInserted = i;
    }

    Eigen::VectorXf pi;
    float startDistance = 0;
    const float MAX_DISTANCE = 0.03f;
    do {
        m_D_detailed(0, 2) = m_biasStrength;
        m_d_detailed(0) = firstInTheAir.ballPos.x() * m_biasStrength;
        m_D_detailed(1, 4) = m_biasStrength;
        m_d_detailed(1) = firstInTheAir.ballPos.y() * m_biasStrength;

        const int filledEntries = (m_kickFrames.size() + ADDITIONAL_DATA_INSERTION) * 2;
        pi = m_D_detailed.block(0, 0, filledEntries, 6).colPivHouseholderQr().solve(m_d_detailed.block(0, 0, filledEntries, 1));

        const Eigen::Vector2f startPos = Eigen::Vector2f(pi(2), pi(4));
        const Eigen::Vector2f trueStart = firstInTheAir.ballPos;
        startDistance = (startPos - trueStart).norm();

        const float FACTOR = 1.2f;
        if (startDistance > MAX_DISTANCE) {
            m_biasStrength *= FACTOR;
        } else if (m_biasStrength > INITIAL_BIAS_STRENGTH) {
            m_biasStrength /= FACTOR;
        }
    } while (startDistance > MAX_DISTANCE);


    const float piError = (m_D_detailed * pi - m_d_detailed).lpNorm<1>();

    const float z0 = pi(0);
    const float vz = pi(1);
    if (vz*vz + GRAVITY*z0*2 < 0) {
        return {};
    }

    // Compute the time the reconstruction thinks the shot started at ground level,
    // relative to the detected shot start time.
    const float atGroundTime = (vz - sqrt(vz*vz + GRAVITY*z0*2)) / GRAVITY;

    const Eigen::Vector2f groundSpeed = Eigen::Vector2f(pi(3), pi(5));
    const Eigen::Vector2f startPos = Eigen::Vector2f(pi(2), pi(4));
    BallFlight result;
    result.groundSpeed = groundSpeed;
    result.flightStartPos = startPos + groundSpeed * atGroundTime;
    result.flightStartTime = firstInTheAir.time + atGroundTime;
    result.captureFlightStartTime = firstInTheAir.captureTime + atGroundTime;
    result.zSpeed = vz - GRAVITY * atGroundTime;
    result.startFrame = m_shotStartFrame;
    result.reconstructionError = piError / (m_kickFrames.size() - m_shotStartFrame);

    debug("pinv_params/x0", result.flightStartPos.x());
    debug("pinv_params/y0", result.flightStartPos.y());
    debug("pinv_params/vx", result.groundSpeed.x());
    debug("pinv_params/vy", result.groundSpeed.y());
    debug("pinv_params/vz", result.zSpeed);
    debug("pinv_params/relStartTime", atGroundTime);
    plot("reconstruction error", result.reconstructionError);

    const float distStartPos = (result.flightStartPos - firstInTheAir.ballPos).norm();
    if (m_flightReconstructions.size() < 2) {
        m_distToStartPos = distStartPos; // is used for filter choice
    }

    const Eigen::Vector2f endPos = result.flightStartPos + result.groundSpeed;
    debugLine("computed ground speed", result.flightStartPos.x(), result.flightStartPos.y(), endPos.x(), endPos.y());

    return result;
}

auto FlyFilter::constrainedReconstruction(Eigen::Vector2f shotStartPos, Eigen::Vector2f groundSpeed,
                                          float startTime, int startFrame) const -> BallFlight
{
    groundSpeed = groundSpeed.normalized();

    const int MAX_ENTRIES = 2*(m_kickFrames.size() - startFrame + 1);
    Eigen::MatrixXf solver = Eigen::MatrixXf::Zero(MAX_ENTRIES, 3);
    Eigen::VectorXf positions = Eigen::VectorXf::Zero(MAX_ENTRIES);

    for (int i=startFrame; i < m_kickFrames.size(); i++) {
        const Eigen::Vector3f cam = m_cameraInfo->cameraPosition.value(m_kickFrames.at(i).cameraId);
        const float t_i = m_kickFrames.at(i).time - startTime;
        const float x = m_kickFrames.at(i).ballPos(0);
        const float y = m_kickFrames.at(i).ballPos(1);
        const float alpha = (cam(0) - x) / cam(2);
        const float beta = (cam(1) - y) / cam(2);

        const int baseIndex = (i - startFrame) * 2;
        solver(baseIndex, 0) = alpha*t_i;
        solver(baseIndex, 1) = -groundSpeed.x() * t_i;
        solver(baseIndex, 2) = alpha;
        positions(baseIndex) = 0.5*GRAVITY*alpha*t_i*t_i + shotStartPos.x() - x;

        solver(baseIndex + 1, 0) = beta*t_i;
        solver(baseIndex + 1, 1) = -groundSpeed.y() * t_i;
        solver(baseIndex + 1, 2) = beta;
        positions(baseIndex + 1) = 0.5*GRAVITY*beta*t_i*t_i + shotStartPos.y() - y;
    }

    const Eigen::VectorXf values = solver.colPivHouseholderQr().solve(positions);

    const float error = (solver * values - positions).norm() / (m_kickFrames.size() - startFrame);
    plot("constrained error", error);

    // ignore the z0 component here, since it should be rather small
    // it is just important to correct noise in the start position
    BallFlight result;
    result.flightStartPos = shotStartPos;
    result.flightStartTime = startTime;
    result.captureFlightStartTime = startTime;
    result.groundSpeed = groundSpeed.normalized() * values(1);
    result.zSpeed = values(0);
    result.startFrame = startFrame;
    result.reconstructionError = error;
    return result;
}

Eigen::Vector2f FlyFilter::approxGroundDirection() const
{
    return m_kickFrames.at(m_shotStartFrame).dribblerPos - m_kickFrames.at(m_shotStartFrame).robotPos;
}

auto FlyFilter::approachShotDirectionApply() const -> BallFlight
{
    const ChipDetection firstInTheAir = m_kickFrames.at(m_shotStartFrame);
    BallFlight reconstruction = constrainedReconstruction(firstInTheAir.ballPos, approxGroundDirection(),
                                                          firstInTheAir.time, m_shotStartFrame);
    reconstruction.flightStartTime -= 0.01f; // -10ms, actual kick was before
    reconstruction.captureFlightStartTime -= 0.01f; // -10ms, actual kick was before
    return reconstruction;
}

// return value in the interval [0,pi] radians
static double innerAngle(Eigen::Vector2f center, Eigen::Vector2f A, Eigen::Vector2f B)
{
    float dx21 = A(0)-center(0);
    float dx31 = B(0)-center(0);
    float dy21 = A(1)-center(1);
    float dy31 = B(1)-center(1);
    float m12 = sqrt( dx21*dx21 + dy21*dy21 );
    float m13 = sqrt( dx31*dx31 + dy31*dy31 );
    return acos( (dx21*dx31 + dy21*dy31) / (m12 * m13) );
}

float FlyFilter::chipShotError(const BallFlight &pinvRes) const
{
    const int startFrame = m_shotStartFrame+2;
    const ChipDetection firstInTheAir = m_kickFrames.at(m_shotStartFrame);

    float error = 0;
    for (int i = startFrame;i<m_kickFrames.size();i++) {
        const float t_i = m_kickFrames.at(i).captureTime - pinvRes.captureFlightStartTime;
        Eigen::Vector2f groundPos = pinvRes.flightStartPos + pinvRes.groundSpeed * t_i;
        float pz = pinvRes.zSpeed * t_i - 0.5f * GRAVITY * t_i * t_i;
        Eigen::Vector3f p(groundPos.x(), groundPos.y(), pz);

        const Eigen::Vector3f cam = m_cameraInfo->cameraPosition.value(m_kickFrames.at(0).cameraId);
        const float lambda = -cam(2) / (cam(2)-p(2));
        const Eigen::Vector3f predGround = cam + (cam-p)*lambda;

        const float dist = (Eigen::Vector2f(predGround.x(), predGround.y()) - m_kickFrames.at(i).ballPos).norm();
        error += dist;
    }

    plot("flight error", error / m_kickFrames.size());
    return error;
}

float FlyFilter::linearShotError() const
{
    const int startFrame = m_shotStartFrame+2;
    const ChipDetection firstInTheAir = m_kickFrames.at(startFrame);

    const int MAX_ENTRIES = 2*(m_kickFrames.size() - startFrame + 1);
    Eigen::MatrixXf solver = Eigen::MatrixXf::Zero(MAX_ENTRIES, 4);
    Eigen::VectorXf positions = Eigen::VectorXf::Zero(MAX_ENTRIES);

    for (int i=startFrame; i < m_kickFrames.size(); i++) {
        const float t_i = m_kickFrames.at(i).captureTime - firstInTheAir.captureTime;

        const int baseIndex = (i - startFrame) * 2;
        solver.row(baseIndex) = Eigen::Vector4f(1, 0, t_i, 0);
        positions(baseIndex) = m_kickFrames.at(i).ballPos.x();

        solver.row(baseIndex + 1) = Eigen::Vector4f(0, 1, 0, t_i);
        positions(baseIndex + 1) = m_kickFrames.at(i).ballPos.y();
    }

    const Eigen::VectorXf simpleShotParameters = solver.colPivHouseholderQr().solve(positions);

    Eigen::Vector2f startPos = Eigen::Vector2f(simpleShotParameters(0), simpleShotParameters(1));
    Eigen::Vector2f startSpeed = Eigen::Vector2f(simpleShotParameters(2), simpleShotParameters(3));
    const Eigen::Vector2f groundDir = startSpeed.normalized();

    for (int i=startFrame; i < m_kickFrames.size(); i++) {
        const float t_i = m_kickFrames.at(i).captureTime - firstInTheAir.captureTime;

        const int baseIndex = (i - startFrame) * 2;
        solver.row(baseIndex) = Eigen::Vector4f(1, 0, t_i * groundDir.x(), -0.5f * t_i * t_i * groundDir.x());
        positions(baseIndex) = m_kickFrames.at(i).ballPos.x();

        solver.row(baseIndex + 1) = Eigen::Vector4f(0, 1, t_i * groundDir.y(), -0.5f * t_i * t_i * groundDir.y());
        positions(baseIndex + 1) = m_kickFrames.at(i).ballPos.y();
    }

    const Eigen::VectorXf accelerationShotParameters = solver.colPivHouseholderQr().solve(positions);
    if (accelerationShotParameters(3) >= 0) {
        startPos = Eigen::Vector2f(accelerationShotParameters(0), accelerationShotParameters(1));
        startSpeed = groundDir * accelerationShotParameters(2);
    }
    const Eigen::Vector2f acc = groundDir * std::max(0.0f, accelerationShotParameters(3));

    float error = 0;
    for (int i = startFrame;i<m_kickFrames.size();i++) {
        const float t_i = m_kickFrames.at(i).captureTime - firstInTheAir.captureTime;
        const Eigen::Vector2f pos = startPos + startSpeed * t_i - 0.5f * t_i * t_i * acc;
        const float dist = (pos - m_kickFrames.at(i).ballPos).norm();
        error += dist;
    }

    plot("ground error", error / m_kickFrames.size());
    return error;
}

static float maxBallHeight(const float vz)
{
    const float maxFlightDurationHalf = vz / GRAVITY;
    return vz * maxFlightDurationHalf - (GRAVITY * 0.5f) * maxFlightDurationHalf * maxFlightDurationHalf;
}

bool FlyFilter::approachPinvApplicable(const BallFlight &pinvRes) const
{
    const Eigen::Vector2f center = m_kickFrames.first().ballPos;
    const double vToProj = innerAngle(center, m_kickFrames.back().ballPos, center + pinvRes.groundSpeed);
    debug("vToProjPinv", vToProj);

    const float vz = pinvRes.zSpeed;
    const int frames = (m_kickFrames.size() - m_shotStartFrame);
    const float shotErrorFactor = m_flightReconstructions.size() > 0 ? 1.0f : 1.5f;
    return  vz > 1 && vz < 10
            && (std::isnan(vToProj) || vToProj < 0.7)
            && ((frames > 5 && m_kickFrames.at(m_shotStartFrame).absSpeed > 1) || frames > 10)
            && linearShotError() > chipShotError(pinvRes) * shotErrorFactor;
}

bool FlyFilter::approachShotDirectionApplicable(const BallFlight &reconstruction) const
{
    // the calulated speed direction should not differ to much from the projection
    const Eigen::Vector2f center = m_kickFrames.first().ballPos;
    const Eigen::Vector2f groundSpeed = approxGroundDirection();
    const double vToProj = innerAngle(center, m_kickFrames.back().ballPos, center + groundSpeed);

    return vToProj < 0.7
            && (m_kickFrames.size() - m_shotStartFrame) > 5
            && (m_kickFrames.size() - m_shotStartFrame) < 15
            && reconstruction.zSpeed > 1 && reconstruction.zSpeed < 10
            && reconstruction.groundSpeed.norm() < 10
            && maxBallHeight(reconstruction.zSpeed) > 0.3f;
}

auto FlyFilter::parabolicFlightReconstruct(const BallFlight& pinvRes) const -> std::optional<BallFlight>
{
    if (approachPinvApplicable(pinvRes)) {
        debug("chip approach", "pinv");
        return pinvRes;
    }

    const BallFlight shotDirReconstruction = approachShotDirectionApply();
    if (approachShotDirectionApplicable(shotDirReconstruction)) {
        debug("chip approach", "shot direction");
        return {shotDirReconstruction};
    }
    debug("chip approach", "unavailable");
    return {};
}

bool FlyFilter::detectionSpeed() const
{
    // Tries to detect chips that are not curvy due to the shot ligning
    // up with the camera (being closer below it).
    // Linear shots quickly slow down after a few frames due to friction,
    // while the perceived ground speed for flights is constant.
    // Therefore, this function computes the slope of the speeds
    // for the shot and checks if it is sufficiently shallow.
    QVector<float> speeds;
    speeds.reserve(m_kickFrames.size()-1);
    for (int i=1; i<m_kickFrames.size(); i++) {
        if (m_kickFrames.at(i).cameraId != m_kickFrames.back().cameraId) {
            // bad geometry calibration may lead to virtual accelerations
            continue;
        }
        const float dist = (m_kickFrames.at(i).ballPos - m_kickFrames.at(i-1).ballPos).norm();
        const float timeDiff = m_kickFrames.at(i).captureTime - m_kickFrames.at(i-1).captureTime;
        speeds.append(dist / timeDiff);
    }
    const float avg = std::accumulate(speeds.begin(), speeds.end(), 0.0) / speeds.size();

    float xSum = 0;
    float valSum = 0;
    float xSumSq = 0;
    float valXSum = 0;
    int n = speeds.size()-1;
    for(int i=1; i<speeds.size(); i++) {
        if (speeds.at(i) > 1.4*avg) {
            debug("detection speed/leave out", true);
            n--;
            continue;
        }
        xSum += i;
        xSumSq += i*i;
        valSum += speeds.at(i);
        valXSum += i*speeds.at(i);
    }
    float slope = (n * valXSum - xSum * valSum) / (n * xSumSq - xSum * xSum);
    slope /= valSum / n;

    debug("detection speed/slope", slope);
    debug("detection speed/avg", avg);
    debug("detection speed/last", speeds.back());

    return slope > 0.005 && speeds.size() > 15 && numMeasurementsWithOwnCamera() > 10;
}

bool FlyFilter::detectionPinv(const BallFlight &pinvRes) const
{
    const float vz = pinvRes.zSpeed;
    const float maxFlightDuration = vz / GRAVITY * 2.0f;
    const float maxHeight = maxBallHeight(pinvRes.zSpeed);
    const float timeElapsed = m_kickFrames.back().time - pinvRes.flightStartTime;

    if (m_kickFrames.front().cameraId != m_kickFrames.back().cameraId) {
        debug("pinv detection/cameraChange", true);
        if (maxHeight < 0.5) {
            // camera changes lead to false detections, probably because of
            // geometry calibration differences
            return false;
        }
    }

    return  vz > 1 && vz < 10
            && pinvRes.reconstructionError < 0.003f
            && pinvRes.groundSpeed.norm() > 1.5
            && timeElapsed < maxFlightDuration
            && maxHeight > 0.3f
            && (m_kickFrames.size() - m_shotStartFrame) > 8;
}

bool FlyFilter::checkIsDribbling() const
{
    // abort shot collection and detection when the shooting robot keeps being close to the ball, i.e. dribbles it
    if (m_kickFrames.size() > 10) {
        const ChipDetection &currentDetection = m_kickFrames.back();
        return (currentDetection.ballPos - currentDetection.robotPos).norm() < 0.12f
                && m_kickFrames.at(0).robotId == currentDetection.robotId;
    }
    return false;
}

bool FlyFilter::detectChip(const BallFlight &pinvRes) const
{
    if (m_shootCommand == ShootCommand::CHIP) {
        debug("detection source", "chip");
        return true;
    }
    if (detectionSpeed()) {
        debug("detection source", "speed");
        return true;
    }
    if (detectionPinv(pinvRes)) {
        debug("detection source", "pinv");
        return true;
    }
    return false;
}

float FlyFilter::toLocalTime(qint64 time) const
{
    const float NS_PER_SEC = 1000000000.0f;
    return (time - m_initTime) / NS_PER_SEC;
}

auto FlyFilter::createChipDetection(const VisionFrame& frame) const -> ChipDetection
{
    const Eigen::Vector2f reportedBallPos(frame.x, frame.y);
    const float timeSinceInit = toLocalTime(frame.time);

    float dribblerSpeed = 0;
    float absSpeed = 0;
    if (m_shotDetectionWindow.size() > 0) {
        const float timeDiff = timeSinceInit - m_shotDetectionWindow.back().time;
        const float lastDribblerDist = (m_shotDetectionWindow.back().dribblerPos-m_shotDetectionWindow.back().ballPos).norm();
        const float dribblerDist = (frame.robot.dribblerPos - reportedBallPos).norm();
        dribblerSpeed = (dribblerDist-lastDribblerDist) / timeDiff;
        absSpeed = (reportedBallPos-m_shotDetectionWindow.back().ballPos).norm() / timeDiff;
    }

    const RobotInfo &robot = frame.robot;
    ShootCommand shootCommand = robot.linearCommand ? (robot.chipCommand ? ShootCommand::BOTH : ShootCommand::LINEAR) :
                                                        (robot.chipCommand ? ShootCommand::CHIP : ShootCommand::NONE);
    if (robot.kickPower > 0 && robot.kickPower < 0.5f) {
        // actively prevent the fly filter from activating, the result for such a short chip will not be good
        shootCommand = ShootCommand::LINEAR;
    }

    const float captureTime = toLocalTime(frame.captureTime);
    return ChipDetection(dribblerSpeed, absSpeed, timeSinceInit, captureTime,
                         reportedBallPos, frame.robot.dribblerPos, frame.robot.robotPos,
                         frame.cameraId, shootCommand, frame.robot.identifier);
}

void FlyFilter::processVisionFrame(const VisionFrame& frame)
{
    const ChipDetection currentDetection = createChipDetection(frame);
    m_shotDetectionWindow.append(currentDetection);
    if (m_shotDetectionWindow.size() > 8) {
        m_shotDetectionWindow.pop_front();
    }

    debug("chip measurements", m_kickFrames.size());

    if (m_kickFrames.empty() && checkIsShot()) {

        // it is possible that in the detection window both a linear and a chip command
        // were given, resulting in ShootCommand::BOTH, which is mostly equivalent to NONE for the flight tracking
        for (const ChipDetection &d : m_shotDetectionWindow) {
            m_shootCommand = static_cast<ShootCommand>(m_shootCommand | d.shootCommand);
        }

        if (m_shotDetectionWindow.at(m_shotDetectionWindow.size() - 4).dribblerSpeed > 0.1f) {
            m_shotStartFrame = 0;
        } else {
            m_shotStartFrame = 1;
        }
        m_lastBounceFrame = m_shotStartFrame;

        m_kickFrames.append(m_shotDetectionWindow.at(m_shotDetectionWindow.size() - 4));
        m_kickFrames.append(m_shotDetectionWindow.at(m_shotDetectionWindow.size() - 3));
        m_kickFrames.append(m_shotDetectionWindow.at(m_shotDetectionWindow.size() - 2));
        // currentDetection is also in m_shotDetectionWindow but will be added by chip detection
        m_shotDetectionWindow.clear();
        // we need to keep the last measurement to infer speed
        m_shotDetectionWindow.append(currentDetection);

        debug("shot detected", 1);
    }

    if (checkIsDribbling()) {
        debug("abort shot dribbling", 1);
        resetFlightReconstruction();
        return;
    }

    if (m_kickFrames.size() > 0) { // chip detection or tracking ongoing
        m_kickFrames.append(currentDetection);

        if (collision()) {
            debug("abort collision", true);
            resetFlightReconstruction();
            return;
        }

        if (m_flightReconstructions.size() > 0) {
            updateBouncing(frame.time);
            if (m_kickFrames.isEmpty()) { // could have been reset by updateBouncing
                return;
            }
        }
        if (m_flightReconstructions.size() < 2) {
            debug("chip detected", m_chipDetected);
            if (m_shootCommand == ShootCommand::LINEAR) {
                resetFlightReconstruction();
                debug("kick command", "linear");
                return; // no detection for linear kicks
            }

            const std::optional<BallFlight> pinvRes = calcPinv();
            if (!m_chipDetected && pinvRes) {
                m_chipDetected = detectChip(*pinvRes);
            }
            if (m_chipDetected && pinvRes) {
                const auto reconstruction = parabolicFlightReconstruct(*pinvRes);
                if (reconstruction.has_value()) {
                    m_flightReconstructions.resize(1);
                    m_flightReconstructions[0] = *reconstruction;
                } else {
                    m_flightReconstructions.clear();
                }
            }
        }
    }

    if (m_kickFrames.size() > 30 && !m_chipDetected) {
        debug("abort still no detection", true);
        resetFlightReconstruction();
    }
    if (m_kickFrames.size() >= MAX_FRAMES_PER_FLIGHT) {
        resetFlightReconstruction();
    }
}

static Eigen::Vector2f perpendicular(const Eigen::Vector2f dir)
{
    return Eigen::Vector2f(dir.y(), -dir.x());
}

int FlyFilter::detectBouncing()
{
    debugCircle("bounce detected", m_kickFrames.at(m_lastBounceFrame).ballPos.x(), m_kickFrames.at(m_lastBounceFrame).ballPos.y(), 0.03f);

    if (m_kickFrames.size() < 10 || m_kickFrames.back().cameraId != m_kickFrames.at(m_kickFrames.size() - 7).cameraId) {
        return -1;
    }

    const int checkFrame = m_kickFrames.size() - 3;
    const bool cameraChangeAfterBounce = m_kickFrames.at(m_lastBounceFrame).cameraId != m_kickFrames.back().cameraId;
    const int shotFrame = cameraChangeAfterBounce ? m_shotStartFrame : m_lastBounceFrame;
    const Eigen::Vector2f shotPos = m_kickFrames.at(checkFrame).ballPos;
    const Eigen::Vector2f shotDir = (shotPos - m_kickFrames.at(shotFrame).ballPos).normalized();
    const Eigen::Vector2f sideDir = perpendicular(shotDir);

    float leftDist = 0;
    float rightDist = 0;
    for (int i = m_lastBounceFrame + 5;i<m_kickFrames.size();i++) {
        if (m_kickFrames.at(i).cameraId != m_kickFrames.back().cameraId) {
            continue;
        }
        const Eigen::Vector2f offset = m_kickFrames.at(i).ballPos - shotPos;
        const float sidePart = offset.dot(sideDir);
        // this might switch around left and right, but it does not matter
        leftDist = std::min(leftDist, sidePart);
        rightDist = std::max(rightDist, sidePart);
    }
    const float maxDist = std::max(std::abs(leftDist), std::abs(rightDist));
    const float minDist = std::min(std::abs(leftDist), std::abs(rightDist));

    if (maxDist > 0.03f && minDist == 0) {
        m_lastBounceFrame = checkFrame;
        return checkFrame;
    }
    return -1;
}

bool FlyFilter::BallFlight::hasBounced(float time) const
{
    const float relativeTime = time - flightStartTime;
    const float flightDuration = 2 * zSpeed / GRAVITY;
    return relativeTime > flightDuration;
}

Eigen::Vector2f FlyFilter::BallFlight::touchdownPos() const
{
    const float flightDuration = 2 * zSpeed / GRAVITY;
    return flightStartPos + groundSpeed * flightDuration;
}

auto FlyFilter::BallFlight::afterBounce(int newStartFrame, const world::BallModel &ballModel) const -> BallFlight
{
    const float flightDuration = 2 * zSpeed / GRAVITY;

    BallFlight bounced;
    bounced.flightStartTime = this->flightStartTime + flightDuration;
    bounced.captureFlightStartTime = this->captureFlightStartTime + flightDuration;
    bounced.zSpeed = this->zSpeed * ballModel.z_damping();
    // only the initial estimate
    bounced.groundSpeed = this->groundSpeed * ballModel.xy_damping();
    bounced.flightStartPos = touchdownPos();
    bounced.startFrame = newStartFrame;
    bounced.reconstructionError = this->reconstructionError;
    return bounced;
}

auto FlyFilter::BallFlight::betweenChipFrames(const ChipDetection &first, const ChipDetection &last, int startFrame) -> BallFlight
{
    const float flightTime = last.time - first.time;
    BallFlight result;
    result.flightStartPos = first.ballPos;
    result.flightStartTime = first.time;
    result.captureFlightStartTime = first.captureTime;
    result.groundSpeed = (last.ballPos - first.ballPos) / flightTime;
    result.zSpeed = GRAVITY * flightTime / 2.0f;
    result.startFrame = startFrame;
    result.reconstructionError = 0;
    return result;
}

void FlyFilter::updateBouncing(qint64 time)
{

    const float t = toLocalTime(time) - m_kickFrames.at(m_shotStartFrame).time;
    const bool hasBounced = m_flightReconstructions.back().hasBounced(toLocalTime(time));
    if (t > 0.3f && hasBounced) {
        const BallFlight afterBounce = m_flightReconstructions.back().afterBounce(m_kickFrames.size() - 1, m_ballModel);
        m_flightReconstructions.append(afterBounce);

        const float distToDetection = (afterBounce.flightStartPos - m_kickFrames.back().ballPos).norm();
        if (m_flightReconstructions.size() > 2 && distToDetection > 0.3f) {
            debug("abort bad bounce", true);
            resetFlightReconstruction();
            return;
        }
    }

    const int bounceFrame = detectBouncing();
    if (bounceFrame != -1) {
        while (m_flightReconstructions.size() > 1 && m_flightReconstructions.back().startFrame > bounceFrame - 20) {
            m_flightReconstructions.pop_back();
        }
        const int startFrame = m_flightReconstructions.back().startFrame;
        const BallFlight fixedFlight = BallFlight::betweenChipFrames(m_kickFrames.at(startFrame),
                                                                     m_kickFrames.at(bounceFrame), startFrame);
        m_flightReconstructions.back() = fixedFlight;
        m_flightReconstructions.append(fixedFlight.afterBounce(bounceFrame, m_ballModel));
    }

    const int framesSinceBounce = m_kickFrames.size() - 1 - m_flightReconstructions.back().startFrame;
    if (m_flightReconstructions.size() > 1 && framesSinceBounce > 0) {
        const BallFlight &currentFlight = m_flightReconstructions.back();

        const Eigen::Vector2f shotDir = currentFlight.groundSpeed.normalized();
        const Eigen::Vector2f sideDir = perpendicular(shotDir);

        float maxShotLineDist = 0;
        float minShotLineDist = 0;
        for (int i = currentFlight.startFrame;i<m_kickFrames.size();i++) {
            const float dist = (m_kickFrames.at(i).ballPos - currentFlight.flightStartPos).dot(sideDir);
            maxShotLineDist = std::max(maxShotLineDist, std::abs(dist));
            minShotLineDist = std::min(minShotLineDist, std::abs(dist));
        }

        // if the shot is sufficiently curved, reconstruct the flight with constrained least squares fitting
        if (maxShotLineDist - minShotLineDist > 0.05f && framesSinceBounce > 4) {
            const BallFlight reconstruction = constrainedReconstruction(currentFlight.flightStartPos, currentFlight.groundSpeed,
                                                               currentFlight.flightStartTime, currentFlight.startFrame);
            const BallFlight &previousFlight = m_flightReconstructions.at(m_flightReconstructions.size() - 2);
            if (reconstruction.groundSpeed.norm() < previousFlight.groundSpeed.norm()
                    && reconstruction.zSpeed > 0 && reconstruction.zSpeed < previousFlight.zSpeed) {
                m_flightReconstructions.back() = reconstruction;
            }

        } else {
            const float initDist = (m_kickFrames.at(currentFlight.startFrame).ballPos - currentFlight.flightStartPos).dot(shotDir);
            const float projectedDistance = (m_kickFrames.back().ballPos - currentFlight.flightStartPos).dot(shotDir) - initDist;
            const float speedLength = projectedDistance / (m_kickFrames.back().captureTime - m_kickFrames.at(currentFlight.startFrame).captureTime);

            m_flightReconstructions.back().groundSpeed = shotDir * speedLength;
        }
    }

    if (t > 0.5f && m_flightReconstructions.back().zSpeed < 0.5f) {
        debug("abort bounce", true);
        resetFlightReconstruction();
        return;
    }
}

FlyFilter::Prediction FlyFilter::predictTrajectory(float time) const
{
    BallFlight flight = m_flightReconstructions.back();
    if (flight.hasBounced(time)) {
        flight = flight.afterBounce(m_kickFrames.size() - 1, m_ballModel);
    }

    const float relativeTime = time - flight.flightStartTime;
    const Eigen::Vector2f groundPos = flight.flightStartPos + flight.groundSpeed * relativeTime;
    const float zSpeed = flight.zSpeed -  GRAVITY * relativeTime;
    const float zPos = relativeTime * flight.zSpeed - 0.5f * GRAVITY * relativeTime * relativeTime;
    return Prediction(groundPos, zPos, flight.groundSpeed, zSpeed, flight.touchdownPos());
}

int FlyFilter::chooseDetection(const std::vector<VisionFrame> &frames) const
{
    const float ACCEPT_DIST = 0.35;

    // acceptance depends on prediction which makes no sense when not active
    // for activation of the filter the acceptance is not necessary
    // as the ground filter will accept a ball lying at the ground
    if (m_flightReconstructions.isEmpty()) {
        return -1;
    }
    // all frames will have the same time and camera id
    const auto pred = predictTrajectory(toLocalTime(frames.at(0).time));
    const Eigen::Vector3f cam = m_cameraInfo->cameraPosition.value(frames.at(0).cameraId);
    const float lambda = -cam(2) / (cam(2)-pred.pos(2));
    const Eigen::Vector3f predGround = cam + (cam-pred.pos)*lambda;

    debugCircle("predicted ground pos", predGround.x(), predGround.y(), 0.02f);

    int bestDetection = -1;
    float bestDistance = ACCEPT_DIST;
    for (std::size_t i = 0;i<frames.size();i++) {
        const VisionFrame &frame = frames[i];
        const Eigen::Vector3f ball(frame.x, frame.y, 0);
        const float dist = (ball - predGround).norm();
        if (dist < bestDistance) {
            bestDetection = i;
            bestDistance = dist;
        }
    }

    debug("accept dist", bestDistance);
    return bestDetection;
}

void FlyFilter::writeBallState(world::Ball *ball, qint64 predictionTime, const QVector<RobotInfo> &, qint64)
{
    const Prediction& p = predictTrajectory(toLocalTime(predictionTime));

    ball->set_p_x(p.pos.x());
    ball->set_p_y(p.pos.y());
    ball->set_p_z(p.pos.z());
    ball->set_v_x(p.speed.x());
    ball->set_v_y(p.speed.y());
    ball->set_v_z(p.speed.z());
    ball->set_is_bouncing(m_flightReconstructions.size() > 1);
    ball->set_touchdown_x(p.touchdownPos(0));
    ball->set_touchdown_y(p.touchdownPos(1));
}

void FlyFilter::resetFlightReconstruction()
{
    debug("RESET", true);
    m_chipDetected = false;
    m_flightReconstructions.clear();
    m_kickFrames.clear();
    m_shootCommand = ShootCommand::NONE;
    m_pinvDataInserted = 0;
    m_biasStrength = INITIAL_BIAS_STRENGTH;
    const int matchEntries = MAX_FRAMES_PER_FLIGHT + ADDITIONAL_DATA_INSERTION;
    m_d_detailed = Eigen::VectorXf::Zero(2*matchEntries);
    m_D_detailed = Eigen::MatrixXf::Zero(2*matchEntries, 6);
}

