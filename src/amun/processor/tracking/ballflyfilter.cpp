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

static const float FLOOR_DAMPING_Z = 0.55f; // robocup 2016: 0.67
static const float FLOOR_DAMPING_GROUND = 0.7f; // heavily dependant on ball spin
static const int MAX_FRAMES_PER_FLIGHT = 200; // 60Hz, 3 seconds in the air
static const int ADDITIONAL_DATA_INSERTION = 1; // these additional are for the position bias
static const float ACCEPT_DIST = 0.35;
static const float INITIAL_BIAS_STRENGTH = 0.1f;
static const int APPROACH_SWITCH_FRAMENO = 16;

static const float GRAVITY = 9.81;

FlyFilter::FlyFilter(const VisionFrame& frame, CameraInfo* cameraInfo, const FieldTransform &transform) :
    AbstractBallFilter(frame, cameraInfo, transform),
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

FlyFilter::PinvResult FlyFilter::calcPinv()
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
    plot("reconstruction error", piError / m_kickFrames.size());

    PinvResult res;
    res.startPos = Eigen::Vector2f(pi(2), pi(4));
    res.groundSpeed = Eigen::Vector2f(pi(3), pi(5));
    res.z0 = pi(0);
    res.vz = pi(1);
    res.reconstructionError = piError / (m_kickFrames.size() - m_shotStartFrame);

    debug("pinv_params/x0", res.startPos.x());
    debug("pinv_params/y0", res.startPos.y());
    debug("pinv_params/vx", res.groundSpeed.x());
    debug("pinv_params/vy", res.groundSpeed.y());
    debug("pinv_params/vz", res.vz);
    debug("pinv_params/z0", res.z0);
    debug("pinv_params/recontruction error", res.reconstructionError);

    const Eigen::Vector2f startPos = firstInTheAir.ballPos;
    const float distStartPos = (res.startPos - startPos).norm();
    if (m_flightReconstructions.size() < 2) {
        m_distToStartPos = distStartPos; // is used for filter choice
    }
    debugCircle("shot start pos", res.startPos.x(), res.startPos.y(), 0.04f);

    const Eigen::Vector2f endPos = res.startPos + res.groundSpeed;
    debugLine("computed ground speed", res.startPos.x(), res.startPos.y(), endPos.x(), endPos.y());

    return res;
}

Eigen::Vector2f FlyFilter::intersectDirection(const PinvResult &pinvRes) const
{
    if (m_kickFrames.size() < 10 && m_kickFrames.at(m_shotStartFrame).absSpeed < 1) {
        debug("intersection dir", "ball to robot");
        return m_kickFrames.at(m_shotStartFrame).ballPos - m_kickFrames.at(m_shotStartFrame).robotPos;
    } else {
        debug("intersection dir", "pinv");
        return pinvRes.groundSpeed;
    }
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

    // ignore the z0 component here, since it should be rather small
    // it is just important to correct noise in the start position
    BallFlight result;
    result.flightStartPos = shotStartPos;
    result.flightStartTime = startTime;
    result.groundSpeed = groundSpeed.normalized() * values(1);
    result.zSpeed = values(0);
    result.startFrame = startFrame;
    return result;
}

auto FlyFilter::approachPinvApply(const PinvResult &pinvRes) const -> BallFlight
{
    const ChipDetection firstInTheAir = m_kickFrames.at(m_shotStartFrame);

    // Compute the time the reconstruction thinks the shot started at ground level,
    // relative to the detected shot start time.
    // approachPinvApplicable guarantees that the ground plane will be reached.
    const float z0 = pinvRes.z0;
    const float vz = pinvRes.vz;
    const float atGroundTime = (vz - sqrt(vz*vz + GRAVITY*z0*2)) / GRAVITY;
    debug("pinv/at ground time", atGroundTime);

    BallFlight result;
    result.groundSpeed = pinvRes.groundSpeed;
    result.flightStartPos = pinvRes.startPos + pinvRes.groundSpeed * atGroundTime;
    result.flightStartTime = firstInTheAir.time + atGroundTime;
    result.zSpeed = pinvRes.vz - GRAVITY * atGroundTime;
    result.startFrame = m_shotStartFrame;
    return result;
}

auto FlyFilter::approachIntersectApply(const PinvResult &pinvRes) const -> BallFlight
{
    const ChipDetection firstInTheAir = m_kickFrames.at(m_shotStartFrame);
    BallFlight reconstruction = constrainedReconstruction(firstInTheAir.ballPos, intersectDirection(pinvRes),
                                                          firstInTheAir.time, m_shotStartFrame);
    reconstruction.flightStartTime = reconstruction.flightStartTime - 0.01f; // -10ms, actual kick was before
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

bool FlyFilter::approachPinvApplicable(const FlyFilter::PinvResult &pinvRes) const
{
    const Eigen::Vector2f center = m_kickFrames.first().ballPos;
    const double vToProj = innerAngle(center, m_kickFrames.back().ballPos, center + pinvRes.groundSpeed);
    debug("vToProjPinv", vToProj);

    const float z0 = pinvRes.z0;
    const float vz = pinvRes.vz;
    // if z0 is so far lower than 0 or vz is very low, the flight trajectory might never reach the ground plane,
    // this leads to problems later
    const bool reconstructionReachesGround = vz*vz + GRAVITY*z0*2 >= 0;
    return  z0 > -0.5 && (z0 < 1 || (m_flightReconstructions.size() > 0 && z0 < 4)) && vz > 1
            && vz < 10
            && (std::isnan(vToProj) || vToProj < 0.7)
            && reconstructionReachesGround;
}

bool FlyFilter::approachIntersectApplicable(const PinvResult &pinvRes) const
{
    // the calulated speed direction should not differ to much from the projection
    const Eigen::Vector2f center = m_kickFrames.first().ballPos;
    const Eigen::Vector2f groundSpeed = intersectDirection(pinvRes);
    const double vToProj = innerAngle(center, m_kickFrames.back().ballPos, center + groundSpeed);
    debug("vToProjIntersection", vToProj);

    // calculated direction has to lie between projection and camera
    const Eigen::Vector3f cam3d = m_cameraInfo->cameraPosition.value(m_kickFrames.back().cameraId);
    const Eigen::Vector2f cam(cam3d(0), cam3d(1));
    const double angleSpeed = innerAngle(center, cam, center + groundSpeed);
    const double angleProjection = innerAngle(center, cam, m_kickFrames.back().ballPos);
    debug("angle v", angleSpeed);
    debug("angle proj", angleProjection);

    return angleSpeed < angleProjection && vToProj < 0.7 && (m_kickFrames.size() - m_shotStartFrame) > 5;
}

auto FlyFilter::parabolicFlightReconstruct(const PinvResult& pinvRes) const -> std::optional<BallFlight>
{
    if (approachPinvApplicable(pinvRes) && m_kickFrames.size() > APPROACH_SWITCH_FRAMENO) {
        debug("chip approach", "pinv");
        return {approachPinvApply(pinvRes)};
    } else {
        const Eigen::Vector2f lastBall = m_kickFrames.back().ballPos;
        const Eigen::Vector3f cam3d = m_cameraInfo->cameraPosition.value(m_kickFrames.back().cameraId);
        const Eigen::Vector2f cam(cam3d(0), cam3d(1));
        const Eigen::Vector2f center = m_kickFrames.first().ballPos;
        const double intersectionAngle = innerAngle(center, cam, lastBall);
        debug("intersection angle", intersectionAngle);

        if (intersectionAngle > 0.4 && approachIntersectApplicable(pinvRes)) { // angle low
            debug("chip approach", "intersection");
            return {approachIntersectApply(pinvRes)};
        } else {
            debug("chip approach", "unavailable");
            return {};
        }
    }
}

bool FlyFilter::detectionCurviness() const
{
    if (m_kickFrames.size() < 5) {
        return false;
    }

    // for a correct refSpeed, search first measurement from current camera
    const int currentCamera = m_kickFrames.back().cameraId;
    const auto firstFromCamera = std::find_if(m_kickFrames.begin(), m_kickFrames.begin() + (m_kickFrames.size() - 1), [currentCamera](const auto &f) {
         return f.cameraId == currentCamera;
    });
    const ChipDetection firstInTheAir = firstFromCamera == m_kickFrames.end() ? m_kickFrames.at(m_shotStartFrame) : *firstFromCamera;
    const float refSpeed = (firstInTheAir.ballPos - m_kickFrames.back().ballPos).norm()
                     / (m_kickFrames.back().captureTime - firstInTheAir.captureTime);

    if (m_kickFrames.size() < 8 && refSpeed < 2) {
        // reflection shots often have a distinct slope at low speeds
        return false;
    }

    const Eigen::Vector3f camPos = m_cameraInfo->cameraPosition.value(m_kickFrames.first().cameraId);

    QList<double> angles;
    const Eigen::Vector2f dp = m_kickFrames.at(0).ballPos;
    for (int j=2; j<m_kickFrames.size(); j++) {
        // start at 2 because first angle is too noisy
        const Eigen::Vector2f ball = m_kickFrames.at(j).ballPos;
        double angle = atan2(camPos(1) - dp(1), camPos(0) - dp(0)) -
                        atan2(ball(1) - dp(1), ball(0) - dp(0));
        angle = fmod(angle + 2*M_PI, 2*M_PI); // norm to 0..2pi
        angles.append(angle);
    }

    double xSum = 0;
    double angleSum = 0;
    double xSumSq = 0;
    double angleXSum = 0;
    for(int i=0; i<angles.size(); i++) {
        xSum += i;
        xSumSq += i*i;
        angleSum += angles.at(i);
        angleXSum += i*angles.at(i);
    }
    const double slope = (angles.size() * angleXSum - xSum * angleSum) / (angles.size() * xSumSq - xSum * xSum);
    debug("detection angle/slope", slope);

    return std::abs(slope) > std::max(-0.03212*m_kickFrames.size() + 0.4873, 0.06);
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

    return slope > 0.005 && speeds.size() > 15;
}

bool FlyFilter::detectionPinv(const FlyFilter::PinvResult &pinvRes) const
{
    const float z0 = pinvRes.z0;
    const float vz = pinvRes.vz;

    const float maxFlightDurationHalf = vz / GRAVITY;
    const float maxFlightDuration = maxFlightDurationHalf*2;
    const float maxHeight = vz*maxFlightDurationHalf - (GRAVITY * 0.5f) *maxFlightDurationHalf*maxFlightDurationHalf;
    const float timeElapsed = m_kickFrames.back().time - m_kickFrames.at(m_shotStartFrame).time;

    const float flightDistGroundCalc = vz*timeElapsed;
    const float flightDistMeasured = (m_kickFrames.front().ballPos - m_kickFrames.back().ballPos).norm();
    debug("pinv detection/flight dist calc", flightDistGroundCalc);
    debug("pinv detection/flight dist measured", flightDistMeasured);
    debug("pinv detection/t", timeElapsed);
    debug("pinv detection/max flightDuration", maxFlightDuration);
    debug("pinv detection/max height", maxHeight);

    if (m_kickFrames.front().cameraId != m_kickFrames.back().cameraId) {
        debug("pinv detection/cameraChange", true);
        if (maxHeight < 0.5) {
            // camera changes lead to false detections, probably because of
            // geometry calibration differences
            return false;
        }
    }

    return  z0 > -0.4 && z0 < 1.5 && vz > 1 && vz < 10
            && pinvRes.reconstructionError < 0.003f
            && pinvRes.groundSpeed.norm() > 1.5
            && timeElapsed < maxFlightDuration
            && maxHeight > 0.1
            && std::abs(flightDistGroundCalc-flightDistMeasured) < std::min(flightDistGroundCalc, flightDistMeasured)/3
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

bool FlyFilter::detectChip(const PinvResult &pinvRes) const
{
    if (m_shootCommand == ShootCommand::CHIP) {
        debug("kick command", "chip");
        return true;
    }
    if (detectionSpeed()) {
        debug("kick command", "unavailable");
        const Eigen::Vector3f cam3d = m_cameraInfo->cameraPosition.value(m_kickFrames.back().cameraId);
        const Eigen::Vector2f cam(cam3d(0), cam3d(1));
        const double angleToCam = innerAngle(m_kickFrames.first().ballPos, cam, m_kickFrames.back().ballPos);

        if (numMeasurementsWithOwnCamera() > 10) { // MAGIC
            debug("detection/speed", true);
            return true;
        }
        debug("angle to cam", angleToCam);
        if (angleToCam > 0.45 && detectionCurviness()) {
            debug("detection/angle", true);
            return true;
        }
    }
    if (detectionPinv(pinvRes)) {
        debug("detection/pinv", true);
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

    const ShootCommand shootCommand = frame.linearCommand ? (frame.chipCommand ? ShootCommand::BOTH : ShootCommand::LINEAR) :
                                                            (frame.chipCommand ? ShootCommand::CHIP : ShootCommand::NONE);

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

            const PinvResult pinvRes = calcPinv();
            if (!m_chipDetected) {
                m_chipDetected = detectChip(pinvRes);
            }
            if (m_chipDetected) {
                const auto reconstruction = parabolicFlightReconstruct(pinvRes);
                if (reconstruction.has_value()) {
                    m_flightReconstructions.resize(1);
                    m_flightReconstructions[0]= *reconstruction;
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

auto FlyFilter::BallFlight::afterBounce(int newStartFrame) const -> BallFlight
{
    const float flightDuration = 2 * zSpeed / GRAVITY;

    BallFlight bounced;
    bounced.flightStartTime = this->flightStartTime + flightDuration;
    bounced.zSpeed = this->zSpeed * FLOOR_DAMPING_Z;
    // only the initial estimate
    bounced.groundSpeed = this->groundSpeed * FLOOR_DAMPING_GROUND;
    bounced.flightStartPos = touchdownPos();
    bounced.startFrame = newStartFrame;
    return bounced;
}

auto FlyFilter::BallFlight::betweenChipFrames(const ChipDetection &first, const ChipDetection &last, int startFrame) -> BallFlight
{
    const float flightTime = last.time - first.time;
    BallFlight result;
    result.flightStartPos = first.ballPos;
    result.flightStartTime = first.time;
    result.groundSpeed = (last.ballPos - first.ballPos) / flightTime;
    result.zSpeed = GRAVITY * flightTime / 2.0f;
    result.startFrame = startFrame;
    return result;
}

void FlyFilter::updateBouncing(qint64 time)
{

    const float t = toLocalTime(time) - m_kickFrames.at(m_shotStartFrame).time;
    const bool hasBounced = m_flightReconstructions.back().hasBounced(toLocalTime(time));
    if (t > 0.3f && hasBounced) {
        const BallFlight afterBounce = m_flightReconstructions.back().afterBounce(m_kickFrames.size() - 1);
        m_flightReconstructions.append(afterBounce);
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
        m_flightReconstructions.append(fixedFlight.afterBounce(bounceFrame));
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

        // if the shot is sufficiently curved, reconstruct the flight with intersection fitting
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
        flight = flight.afterBounce(m_kickFrames.size() - 1);
    }

    const float relativeTime = time - flight.flightStartTime;
    const Eigen::Vector2f groundPos = flight.flightStartPos + flight.groundSpeed * relativeTime;
    const float zSpeed = flight.zSpeed -  GRAVITY * relativeTime;
    const float zPos = relativeTime * flight.zSpeed - 0.5f * GRAVITY * relativeTime * relativeTime;
    return Prediction(groundPos, zPos, flight.groundSpeed, zSpeed, flight.touchdownPos());
}

int FlyFilter::chooseDetection(const std::vector<VisionFrame> &frames) const
{
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

