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
static const int APPROACH_SWITCH_FRAMENO = 16;

static const float GRAVITY = 9.81;

FlyFilter::FlyFilter(const VisionFrame& frame, CameraInfo* cameraInfo, const FieldTransform &transform) :
    AbstractBallFilter(frame, cameraInfo, transform),
    m_initTime(frame.time),
    m_flyFitter(MAX_FRAMES_PER_FLIGHT)
{
    resetFlightReconstruction();
}

Eigen::Vector3f FlyFilter::unproject(const ChipDetection& detection, float ballRadius) const
{
    const float f = m_cameraInfo->focalLength.value(detection.cameraId);
    const float a = detection.ballArea;
    const float distInferred = f * (ballRadius/sqrt(a/M_PI) + 1) / 1000.0;
    const Eigen::Vector3f cam = m_cameraInfo->cameraPosition.value(detection.cameraId);
    const Eigen::Vector3f ballGround(detection.ballPos(0), detection.ballPos(1), 0);
    // set calculated length on direction from camera to reported
    return cam + (ballGround - cam).normalized() * distInferred;
}

static bool monotonicRisingOneException(const QList<float>& points)
{
    int exceptions = 0;
    for (int i=0; i<points.size()-1; i++) {
        if (points.at(i+1) > points.at(i)){
            exceptions++;
        }
    }
    return exceptions < 2;
}

bool FlyFilter::isActive() const
{
    return m_isActive;
}

bool FlyFilter::checkIsShot() const
{
    if (m_shotDetectionWindow.size() < 4) {
        return false;
    }

    const float dist = (m_shotDetectionWindow.at(1).ballPos - m_shotDetectionWindow.at(3).ballPos).norm();
    const float timeDiff = m_shotDetectionWindow.at(3).time - m_shotDetectionWindow.at(1).time;
    const float absSpeed = dist / timeDiff;

    const float dribblerDist0 = (m_shotDetectionWindow.at(0).dribblerPos - m_shotDetectionWindow.at(0).ballPos).norm();
    const float dribblerDist1 = (m_shotDetectionWindow.at(0).dribblerPos - m_shotDetectionWindow.at(1).ballPos).norm();
    const float dribblerDist2 = (m_shotDetectionWindow.at(0).dribblerPos - m_shotDetectionWindow.at(2).ballPos).norm();
    const float dribblerDist3 = (m_shotDetectionWindow.at(0).dribblerPos - m_shotDetectionWindow.at(3).ballPos).norm();

    const bool distanceMonotonicRising = dribblerDist0 < dribblerDist1 && dribblerDist1 < dribblerDist2 && dribblerDist2 < dribblerDist3;

    return m_shotDetectionWindow.at(1).dribblerSpeed > m_shotDetectionWindow.at(0).dribblerSpeed
            && m_shotDetectionWindow.at(1).dribblerSpeed > 0.1f
            && absSpeed > 1
            && m_shotDetectionWindow.at(1).absSpeed - m_shotDetectionWindow.at(0).absSpeed > 0.2f
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
    const float height = m_isActive ? predictTrajectory(m_kickFrames.back().time).pos(2) : 0.0f;
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

        m_D_detailed(i*2, 0) = alpha;
        m_D_detailed(i*2, 1) = alpha*t_i;
        m_D_detailed(i*2, 2) = 1;
        m_D_detailed(i*2, 3) = t_i;
        m_D_detailed(i*2, 4) = 0;
        m_D_detailed(i*2, 5) = 0;
        m_d_detailed(i*2) = 0.5*GRAVITY*alpha*t_i*t_i + x;

        m_D_detailed(i*2+1, 0) = beta;
        m_D_detailed(i*2+1, 1) = beta*t_i;
        m_D_detailed(i*2+1, 2) = 0;
        m_D_detailed(i*2+1, 3) = 0;
        m_D_detailed(i*2+1, 4) = 1;
        m_D_detailed(i*2+1, 5) = t_i;
        m_d_detailed(i*2+1) = 0.5*GRAVITY*beta*t_i*t_i + y;
        m_pinvDataInserted = i;
    }

    const float strength = 0.1f;
    const int lastIndex = MAX_FRAMES_PER_FLIGHT * 2 - 1;
    m_D_detailed(lastIndex, 2) = strength;
    m_d_detailed(lastIndex) = firstInTheAir.ballPos.x() * strength;
    m_D_detailed(lastIndex-1, 4) = strength;
    m_d_detailed(lastIndex-1) = firstInTheAir.ballPos.y() * strength;

    const Eigen::VectorXf pi = m_D_detailed.colPivHouseholderQr().solve(m_d_detailed);
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
    if (!m_isBouncing) {
        m_distToStartPos = distStartPos; // is used for filter choice
    }
    debugCircle("shot start pos", res.startPos.x(), res.startPos.y(), 0.04f);

    const Eigen::Vector2f endPos = res.startPos + res.groundSpeed;
    debugLine("computed ground speed", res.startPos.x(), res.startPos.y(), endPos.x(), endPos.y());

    return res;
}

FlyFilter::IntersectionResult FlyFilter::calcIntersection(const PinvResult &pinvRes) const
{
    // intersection approach
    Eigen::Vector2f vGround;
    if (m_kickFrames.size() < 10 && m_kickFrames.at(m_shotStartFrame).absSpeed < 1) {
        vGround = m_kickFrames.at(m_shotStartFrame).ballPos - m_kickFrames.at(m_shotStartFrame).robotPos;
        debug("intersection dir", "ball to robot");
    } else {
        debug("intersection dir", "pinv");
        vGround = pinvRes.groundSpeed;
    }

    const Eigen::Vector2f S = m_kickFrames.at(m_shotStartFrame).ballPos;
    const Eigen::Vector2f V = S+vGround;
    const float startTime = m_kickFrames.at(m_shotStartFrame).time;

    int numZSpeeds = 0;
    float zSpeed = 0;
    float groundSpeedLength = 0;
    for (int i=m_shotStartFrame+1; i < m_kickFrames.size(); i++) {
        const ChipDetection& f = m_kickFrames.at(i);
        const Eigen::Vector3f cam = m_cameraInfo->cameraPosition.value(f.cameraId);

        const Eigen::Vector2f K(cam(0), cam(1));
        const Eigen::Vector2f P = f.ballPos;

        debugLine("sp", S(0), S(1), V(0), V(1), 1);
        debugLine("pr", K(0), K(1), P(0), P(1), 2);
        const float numerator = (K(1)-S(1))/(V(1)-S(1)) - (K(0)-S(0))/(V(0)-S(0));
        const float denominator = (P(0)-K(0))/(V(0)-S(0)) - (P(1)-K(1))/(V(1)-S(1));
        const float mu = numerator/denominator;
        const Eigen::Vector2f intersection = K + (P-K) * mu;
        debugCircle("intersection", intersection(0), intersection(1), 0.04);

        const float timeDiff = f.time - startTime;
        const float speed = (S - intersection).norm() / timeDiff;
        groundSpeedLength += speed;

        const float H = cam(2);
        const float d = (P - intersection).norm();
        const float D = (K - P).norm();
        const float h = (H*d) / D; // intersect theorem

        zSpeed += h/timeDiff + GRAVITY * 0.5f * timeDiff;
        numZSpeeds++;
    }
    groundSpeedLength /= (m_kickFrames.size()-m_shotStartFrame-1);
    zSpeed /= numZSpeeds;

    IntersectionResult res;
    res.intersectionGroundSpeed = vGround.normalized() * groundSpeedLength;
    res.intersectionZSpeed = zSpeed;
    debug("approx/z speed", res.intersectionZSpeed);
    return res;
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
    return result;
}

auto FlyFilter::approachIntersectApply(const FlyFilter::IntersectionResult &intRes) const -> BallFlight
{
    const ChipDetection firstInTheAir = m_kickFrames.at(m_shotStartFrame);
    BallFlight result;
    result.flightStartPos = m_kickFrames.at(m_shotStartFrame).ballPos;
    result.flightStartTime = firstInTheAir.time - 0.01f; // -10ms, actual kick was before
    result.groundSpeed = intRes.intersectionGroundSpeed;
    result.zSpeed = intRes.intersectionZSpeed;
    debug("method intersect", true);
    debug("approx/speed length", intRes.intersectionGroundSpeed.norm());
    return result;
}

auto FlyFilter::approachAreaApply() -> BallFlight
{
    const ChipDetection firstInTheAir = m_kickFrames.at(m_shotStartFrame);
    BallFlight result;
    result.flightStartPos = m_kickFrames.at(m_shotStartFrame).ballPos;
    result.flightStartTime = firstInTheAir.time;
    result.zSpeed = 0;
    result.groundSpeed = Eigen::Vector2f(0, 0);
    if (m_kickFrames.size() < m_shotStartFrame+4) {
        return result;
    }

    float ballRadius = 0;
    const int startR = m_shotStartFrame+1;
    const int endR = m_shotStartFrame+4;
    for (int i=startR; i<endR; i++) {
        const Eigen::Vector3f ballPos(m_kickFrames.at(i).ballPos(0), m_kickFrames.at(i).ballPos(1), 0);
        const Eigen::Vector3f cam = m_cameraInfo->cameraPosition.value(m_kickFrames.at(i).cameraId);
        const float d = (ballPos - cam).norm() * 1000 -100; // mm
        const float focalLength = m_cameraInfo->focalLength.value(m_kickFrames.at(i).cameraId);
        const float r = (d / focalLength - 1) * sqrt(m_kickFrames.at(i).ballArea/M_PI);
        debug(QString("ball radius")+QString::number(i), r);
        ballRadius += r;
    }

    ballRadius /= (endR-startR);
    debug("ball radius", ballRadius);

    float speedXSum = 0.0;
    float speedYSum = 0.0;
    const int start = m_shotStartFrame+2; // m_shotStartFrame+1 is first in the air
    const int end = m_kickFrames.size();
    for (int i=start; i<end; i++) {
        const ChipDetection& m = m_kickFrames.at(i);
        const float timeDiff = m.time - firstInTheAir.time;
        const Eigen::Vector3f unprojPos = unproject(m, ballRadius);
        const float xDist = unprojPos.x() - firstInTheAir.ballPos.x();
        const float yDist = unprojPos.y() - firstInTheAir.ballPos.y();
        speedXSum += xDist/timeDiff;
        speedYSum += yDist/timeDiff;
    }

    const int num = end-start;
    const Eigen::Vector2f speed(speedXSum/num, speedYSum/num);
    debug("height/vx", speed(0));
    debug("height/vy", speed(1));
    debug("height/v total", speed.norm());

    result.groundSpeed = speed;//dir.normalized()*speedLengthViaHeight;

    debugLine("calc dir", firstInTheAir.ballPos(0), firstInTheAir.ballPos(1), firstInTheAir.ballPos(0)+speed(0), firstInTheAir.ballPos(1)+speed(1));

    const float startTime = m_kickFrames.at(m_shotStartFrame).time;
    for (int i=start; i<end; i++) {
        const ChipDetection& m = m_kickFrames.at(i);
        const float time = m.time - startTime;
        const Eigen::Vector3f unprojPos = unproject(m, ballRadius);
        const float height = unprojPos.z();

        m_flyFitter.addPoint(time, height);
    }
    const QuadraticLeastSquaresFitter::QuadraticFitResult res = m_flyFitter.fit();
    debug("height/res b", res.b);
    result.zSpeed = res.b;

    debug("method height", true);
    return result;
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
    return  z0 > -0.5 && (z0 < 1 || (m_isActive && z0 < 4)) && vz > 1
            && vz < 10
            && (std::isnan(vToProj) || vToProj < 0.7)
            && reconstructionReachesGround;
}

bool FlyFilter::approachIntersectApplicable(const FlyFilter::IntersectionResult &intRes) const
{
    // the calulated speed direction should not differ to much from the projection
    const Eigen::Vector2f center = m_kickFrames.first().ballPos;
    const double vToProj = innerAngle(center, m_kickFrames.back().ballPos, center + intRes.intersectionGroundSpeed);
    debug("vToProjIntersection", vToProj);

    // calculated direction has to lie between projection and camera
    const Eigen::Vector3f cam3d = m_cameraInfo->cameraPosition.value(m_kickFrames.back().cameraId);
    const Eigen::Vector2f cam(cam3d(0), cam3d(1));
    const double angleSpeed = innerAngle(center, cam, center + intRes.intersectionGroundSpeed);
    const double angleProjection = innerAngle(center, cam, m_kickFrames.back().ballPos);
    debug("angle v", angleSpeed);
    debug("angle proj", angleProjection);

    return angleSpeed < angleProjection && vToProj < 0.7 && (m_kickFrames.size() - m_shotStartFrame) > 5;
}

void FlyFilter::parabolicFlightReconstruct(const PinvResult& pinvRes)
{
    if (approachPinvApplicable(pinvRes) && m_kickFrames.size() > APPROACH_SWITCH_FRAMENO) {
        debug("chip approach", "pinv");
        m_flightReconstruction = approachPinvApply(pinvRes);
        m_isActive = true;
    } else {
        const Eigen::Vector2f lastBall = m_kickFrames.back().ballPos;
        const Eigen::Vector3f cam3d = m_cameraInfo->cameraPosition.value(m_kickFrames.back().cameraId);
        const Eigen::Vector2f cam(cam3d(0), cam3d(1));
        const Eigen::Vector2f center = m_kickFrames.first().ballPos;
        const double intersectionAngle = innerAngle(center, cam, lastBall);
        debug("intersection angle", intersectionAngle);

        const IntersectionResult intRes = calcIntersection(pinvRes);

        if (intersectionAngle < 0.4 && m_kickFrames.size() > 6) { // angle low
            debug("chip approach", "height");
            m_flightReconstruction = approachAreaApply();
            m_isActive = true;
        } else if (approachIntersectApplicable(intRes)) {
            debug("chip approach", "intersection");
            m_flightReconstruction = approachIntersectApply(intRes);
            m_isActive = true;
        } else {
            debug("chip approach", "unavailable");
            m_isActive = false;
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

bool FlyFilter::detectionHeight() const
{
    if (m_kickFrames.size() < 5) {
        return false;
    }

    if (m_kickFrames.back().cameraId != m_kickFrames.front().cameraId) {
        // if camera changed, and we have not detected a chip yet,
        // assumptions about the ball radius become invalid
        return false;
    }

    float ballRadius = 0;
    const int startR = m_shotStartFrame+1;
    const int endR = m_shotStartFrame+4;

    for (int i=startR; i<endR; i++) {
        const Eigen::Vector3f ballPos(m_kickFrames.at(i).ballPos(0), m_kickFrames.at(i).ballPos(1), 0);
        const Eigen::Vector3f cam = m_cameraInfo->cameraPosition.value(m_kickFrames.at(i).cameraId);
        const float d = (ballPos - cam).norm() * 1000 - 50; // mm
        const float focalLength = m_cameraInfo->focalLength.value(m_kickFrames.at(i).cameraId);
        const float r = (d / focalLength - 1) * sqrt(m_kickFrames.at(i).ballArea/M_PI);
        debug(QString("ball radius")+QString::number(i), r);
        ballRadius += r;
    }
    ballRadius /= (endR-startR);

    QList<float> heights;
    for (const auto& m : m_kickFrames) {
        heights.append(unproject(m, ballRadius)(2));
    }
    const float low = heights.at(0)+heights.at(1);
    const float high = heights.at(heights.size()-2)+heights.at(heights.size()-1);

    debug("detection height/high", high);
    debug("detection height/diff", high-low);
    if (m_kickFrames.size() > 6 && monotonicRisingOneException(heights)) {
        debug("detection height/mon", true);
        return high > 0.5 && high-low > 0.5;
    }
    return high > 1 && high-low > 1;
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
        const float timeDiff = m_kickFrames.at(i).time - m_kickFrames.at(i-1).time;
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
    const bool heightSaysChip = detectionHeight(); // run for debug info
    if (m_kickFrames.front().chipCommand) {
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
        if (angleToCam > 0.45) { // MAGIC
            if (detectionCurviness()) {
                debug("detection/angle", true);
                return true;
            }
        } else if (heightSaysChip) {
            debug("detection/height", true);
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

    const float captureTime = toLocalTime(frame.captureTime);
    return ChipDetection(dribblerSpeed, absSpeed, timeSinceInit, captureTime,
                         reportedBallPos, frame.robot.dribblerPos, frame.ballArea, frame.robot.robotPos,
                         frame.cameraId, frame.chipCommand, frame.linearCommand, frame.robot.identifier);
}

void FlyFilter::processVisionFrame(const VisionFrame& frame)
{
    const ChipDetection currentDetection = createChipDetection(frame);
    m_shotDetectionWindow.append(currentDetection);
    if (m_shotDetectionWindow.size() > 4) {
        m_shotDetectionWindow.pop_front();
    }

    debug("chip measurements", m_kickFrames.size());

    if (m_kickFrames.empty() && checkIsShot()) {

        if (m_shotDetectionWindow.at(0).dribblerSpeed > 0.1f) {
            m_shotStartFrame = 0;
        } else {
            m_shotStartFrame = 1;
        }

        m_kickFrames.append(m_shotDetectionWindow.at(0));
        m_kickFrames.append(m_shotDetectionWindow.at(1));
        m_kickFrames.append(m_shotDetectionWindow.at(2));
        // currentDetection is also in m_shotDetectionWindow but will be added by chip detection
        m_shotDetectionWindow.clear();
        // we need to keep the last measurement to infer speed
        m_shotDetectionWindow.append(m_kickFrames.back());

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

        updateBouncing(frame.time);
        if (!m_isBouncing && m_kickFrames.size() > 0) { // could have been reset by updateBouncing
            debug("chip detected", m_chipDetected);
            if (m_kickFrames.front().linearCommand) {
                resetFlightReconstruction();
                debug("kick command", "linear");
                return; // no detection for linear kicks
            }

            const PinvResult pinvRes = calcPinv();
            if (!m_chipDetected) {
                m_chipDetected = detectChip(pinvRes);
            }
            if (m_chipDetected) {
                parabolicFlightReconstruct(pinvRes);
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

auto FlyFilter::BallFlight::afterBounce() const -> BallFlight
{
    const float flightDuration = 2 * zSpeed / GRAVITY;

    BallFlight bounced;
    bounced.flightStartTime = this->flightStartTime + flightDuration;
    bounced.zSpeed = this->zSpeed * FLOOR_DAMPING_Z;
    // only the initial estimate
    bounced.groundSpeed = this->groundSpeed * FLOOR_DAMPING_GROUND;
    bounced.flightStartPos = touchdownPos();
    return bounced;
}

void FlyFilter::updateBouncing(qint64 time)
{
    const float t = toLocalTime(time) - m_flightReconstruction.flightStartTime;

    if (m_isActive && (t > 0.3f || m_isBouncing)) {
        if (m_flightReconstruction.hasBounced(toLocalTime(time))) {
            m_isBouncing = true;
            m_flightReconstruction = m_flightReconstruction.afterBounce();

            if (m_flightReconstruction.zSpeed < 0.1f) {
                debug("abort bounce", true);
                resetFlightReconstruction();
                return;
            }
        }
    }

    // TODO: fix/rework this rather questionable code
    if (m_isBouncing && false) {
        float groundSpeed = 0;
        int num = 0;
        for (int i=m_kickFrames.size()-1; i>0 && i>m_kickFrames.size()-5; i--) {
            const ChipDetection& first = m_kickFrames.at(i);
            const ChipDetection& second = m_kickFrames.front();
            groundSpeed += (first.ballPos-second.ballPos).norm() / (first.time - second.time);
            num++;
        }
        groundSpeed /= (num+2); // TODO FIXME. error lies probably in flightStartTime
        m_flightReconstruction.groundSpeed = m_flightReconstruction.groundSpeed.normalized() * groundSpeed;
    }
}

FlyFilter::Prediction FlyFilter::predictTrajectory(float time) const
{
    BallFlight flight = m_flightReconstruction;
    if (flight.hasBounced(time)) {
        flight = flight.afterBounce();
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
    if (!m_isActive) {
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

static float dist(float v0, float v1, float acc)
{
    const float time = std::abs(v0 - v1) / acc;
    return 0.5f * (v0 + v1) * time;
}

void FlyFilter::writeBallState(world::Ball *ball, qint64 predictionTime, const QVector<RobotInfo> &, qint64)
{
    const Prediction& p = predictTrajectory(toLocalTime(predictionTime));

    // maximum height that will be reached in the future by the ball
    // assume no floor damping for this approximation, therefore it can be handled in one case
    const float topHeight = p.pos.z() + dist(std::abs(p.speed.z()), 0, GRAVITY);

    // leave prediction to kalman filter for low flying balls
    if ((m_isActive && !m_isBouncing) || topHeight > 0.05f) {
        ball->set_p_x(p.pos(0));
        ball->set_p_y(p.pos(1));
        ball->set_v_x(p.speed(0));
        ball->set_v_y(p.speed(1));
    } else {
        debug("hybrid filter", true);
    }
    ball->set_p_z(p.pos(2));
    ball->set_v_z(p.speed(2));
    ball->set_is_bouncing(m_isBouncing);
    ball->set_touchdown_x(p.touchdownPos(0));
    ball->set_touchdown_y(p.touchdownPos(1));
}

void FlyFilter::resetFlightReconstruction()
{
    debug("RESET", true);
    m_isActive = false;
    m_chipDetected = false;
    m_isBouncing = false;
    m_kickFrames.clear();
    m_flyFitter.clear();
    m_pinvDataInserted = 0;
    const int matchEntries = MAX_FRAMES_PER_FLIGHT + ADDITIONAL_DATA_INSERTION;
    m_d_detailed = Eigen::VectorXf::Zero(2*matchEntries);
    m_D_detailed = Eigen::MatrixXf::Zero(2*matchEntries, 6);
}

