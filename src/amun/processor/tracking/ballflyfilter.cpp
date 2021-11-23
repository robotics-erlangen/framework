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

static const float floorDamping = 0.55; // robocup 2016: 0.67
static const int MAX_FRAMES_PER_FLIGHT = 200; // 60Hz, 3 seconds in the air
static const float ACCEPT_DIST = 0.35;
static const float ACTIVE_DIST = 0.5; // must be greater or equal to accept dist
static const int APPROACH_SWITCH_FRAMENO = 16;

static const float GRAVITY = 9.81;
static const double NS_PER_SEC = 1000000000.0;

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
    return m_isActive && m_acceptDist < ACTIVE_DIST;
}

bool FlyFilter::checkIsShot()
{
    if (m_shotDetectionWindow.size() < 4) {
        return false;
    }

    const float dribblerDist0 = (m_shotDetectionWindow.at(0).dribblerPos - m_shotDetectionWindow.at(0).ballPos).norm();
    const float dribblerDist1 = (m_shotDetectionWindow.at(0).dribblerPos - m_shotDetectionWindow.at(1).ballPos).norm();
    const float dribblerDist2 = (m_shotDetectionWindow.at(0).dribblerPos - m_shotDetectionWindow.at(2).ballPos).norm();
    const float dribblerDist3 = (m_shotDetectionWindow.at(0).dribblerPos - m_shotDetectionWindow.at(3).ballPos).norm();

    const double dist = (m_shotDetectionWindow.at(1).ballPos - m_shotDetectionWindow.at(3).ballPos).norm();
    const double timeDiff = (m_shotDetectionWindow.at(3).time - m_shotDetectionWindow.at(1).time) / NS_PER_SEC;
    const float absSpeed = dist/timeDiff;

    if (
            ((m_shotDetectionWindow.at(1).dribblerSpeed > m_shotDetectionWindow.at(0).dribblerSpeed)
            && m_shotDetectionWindow.at(1).dribblerSpeed > 0.1
            && absSpeed > 1
            && m_shotDetectionWindow.at(1).absSpeed - m_shotDetectionWindow.at(0).absSpeed > 0.2
            )) {
        if (
            // distance monotonic rising
            dribblerDist0 < dribblerDist1
            && dribblerDist1 < dribblerDist2
            && dribblerDist2 < dribblerDist3
            // moved at least 6cm
            && dribblerDist3 - dribblerDist0 > 0.06
            // initial ball pos close to dribbler
            && dribblerDist0 < 0.1
        ){
            if (m_shotDetectionWindow.at(0).dribblerSpeed > 0.1) {
                m_shotStartFrame = 0;
            } else {
                m_shotStartFrame = 1;
            }
            return true;
        }
    }
    return false;
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

bool FlyFilter::collision()
{
    if (m_kickFrames.size() < 3 || !m_isActive) {
        return false;
    }
    const auto& first = m_kickFrames.at(m_kickFrames.size()-3);
    const auto& second = m_kickFrames.at(m_kickFrames.size()-2);
    const auto& third = m_kickFrames.at(m_kickFrames.size()-1);

    const float angle = fabs(atan2(first.ballPos(1)-second.ballPos(1), first.ballPos(0)-second.ballPos(0))
            - atan2(third.ballPos(1)-second.ballPos(1), third.ballPos(0)-second.ballPos(0)));

    const float robotDist = (m_kickFrames.back().ballPos - m_kickFrames.back().robotPos).norm();
    const float height = predictTrajectory(m_lastPredictionTime).pos(2);
    const bool collision = (angle < 0.86*M_PI || angle > 1.14*M_PI) && height < 0.15f && robotDist < 0.18f;
    return collision;
}

FlyFilter::PinvResult FlyFilter::calcPinv()
{
    ChipDetection firstInTheAir = m_kickFrames.at(m_shotStartFrame);

    const double lowerTimeBound = firstInTheAir.time;
    if (m_pinvDataInserted == 0) {
        m_pinvDataInserted = m_shotStartFrame-1;
    }
    const float x0 = firstInTheAir.ballPos(0);
    const float y0 = firstInTheAir.ballPos(1);
    for (int i=m_pinvDataInserted+1; i<m_kickFrames.size(); i++) {
        const Eigen::Vector3f cam = m_cameraInfo->cameraPosition.value(m_kickFrames.at(i).cameraId);
        const double time = m_kickFrames.at(i).time - lowerTimeBound;
        const double x = m_kickFrames.at(i).ballPos(0);
        const double y = m_kickFrames.at(i).ballPos(1);
        const double t_i = time / NS_PER_SEC; // seconds
        const double alpha = (x-cam(0)) / cam(2);
        const double beta = (y-cam(1)) / cam(2);

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

        m_D_coarseControl(i*2, 0) = alpha; //z0
        m_D_coarseControl(i*2, 1) = alpha*t_i; // vz
        m_D_coarseControl(i*2, 2) = t_i; // vx
        m_D_coarseControl(i*2, 3) = 0; // vy
        m_d_coarseControl(i*2) = 0.5*GRAVITY*alpha*t_i*t_i + x - x0;

        m_D_coarseControl(i*2+1, 0) = beta; // z0
        m_D_coarseControl(i*2+1, 1) = beta*t_i; // vz
        m_D_coarseControl(i*2+1, 2) = 0; //vx
        m_D_coarseControl(i*2+1, 3) = t_i; // vy
        m_d_coarseControl(i*2+1) = 0.5*GRAVITY*beta*t_i*t_i + y - y0;
        m_pinvDataInserted = i;
    }

    const Eigen::VectorXf pi = m_D_detailed.colPivHouseholderQr().solve(m_d_detailed);
    const Eigen::VectorXf piControl = m_D_coarseControl.colPivHouseholderQr().solve(m_d_coarseControl);

    PinvResult res;
    res.x0 = pi(2);
    res.y0 = pi(4);
    res.z0 = pi(0);
    res.vx = pi(3);
    res.vy = pi(5);
    res.vz = pi(1);

    debug("pinv_params/x0", res.x0);
    debug("pinv_params/y0", res.y0);
    debug("pinv_params/vx", res.vx);
    debug("pinv_params/vy", res.vy);
    debug("pinv_params/vz", res.vz);
    debug("pinv_params/z0", res.z0);

    debug("pinv_params/z0 control", piControl(0));
    debug("pinv_params/vx control", piControl(2));
    debug("pinv_params/vy control", piControl(3));
    debug("pinv_params/vz control", piControl(1));

    res.vxControl = piControl(2);
    res.vyControl = piControl(3);

    const Eigen::Vector2f startPos = firstInTheAir.ballPos;
    const Eigen::Vector2f calculatedStartPos = Eigen::Vector2f(res.x0, res.y0);
    const float distStartPos = (calculatedStartPos-startPos).norm();
    if (!m_bouncing) {
        m_distToStartPos = distStartPos; // is used for filter choice
    }
    debugCircle("calc start pos", calculatedStartPos(0), calculatedStartPos(1), 0.04);
    res.distStartPos = distStartPos;
    debug("pinv_params/dist start pos", res.distStartPos);

    const Eigen::Vector2f vGroundPinv(res.vx, res.vy);
    const Eigen::Vector2f endPos = firstInTheAir.ballPos + vGroundPinv;
    debugLine("dirDet", m_kickFrames.first().ballPos(0), m_kickFrames.first().ballPos(1), endPos(0), endPos(1));

    const Eigen::Vector2f vGroundPinvControl(res.vxControl, res.vyControl);
    const Eigen::Vector2f endPosC = firstInTheAir.ballPos + vGroundPinvControl;
    debugLine("dirCoa", m_kickFrames.first().ballPos(0), m_kickFrames.first().ballPos(1), endPosC(0), endPosC(1), 1);

    debug("pinv_params/ground speed pinv control", vGroundPinvControl.norm());
    debug("pinv_params/ground speed pinv", vGroundPinv.norm());

    if (firstInTheAir.cameraId != m_kickFrames.back().cameraId) {
        // for a correct refSpeed, search first measurement from current camera
        for (auto& m: m_kickFrames) {
            if (m.cameraId == m_kickFrames.back().cameraId && m.ballPos(0) != m_kickFrames.back().ballPos(0)) {
                firstInTheAir = m;
                break;
            }
        }
    }
    const float refSpeed = (firstInTheAir.ballPos - m_kickFrames.back().ballPos).norm()
                     / ((m_kickFrames.back().time - firstInTheAir.time)/NS_PER_SEC);
    debug("pinv_params/ground speed raw", refSpeed);
    res.refSpeed = refSpeed;

    return res;
}

FlyFilter::IntersectionResult FlyFilter::calcIntersection(const PinvResult &pinvRes) const
{
    // intersection approach
    Eigen::Vector2f vGround;
    if (m_kickFrames.size() < 10 && m_kickFrames.at(m_shotStartFrame).absSpeed < 1) {
        vGround = m_kickFrames.at(m_shotStartFrame).ballPos-m_kickFrames.at(m_shotStartFrame).robotPos;
        debug("intersection dir", "ball to robot");
    } else {
        debug("intersection dir", "pinv");
        if (pinvRes.vx*pinvRes.vxControl < 0 && pinvRes.vy*pinvRes.vyControl < 0) {
            vGround = Eigen::Vector2f(pinvRes.vxControl, pinvRes.vyControl);
            debug("correction", true);
        } else {
            vGround = Eigen::Vector2f(pinvRes.vx, pinvRes.vy);
        }
    }

    const Eigen::Vector2f S = m_kickFrames.at(m_shotStartFrame).ballPos;
    const Eigen::Vector2f V = S+vGround;
    const double startTime = m_kickFrames.at(m_shotStartFrame).time;

    int numZSpeeds = 0;
    double zSpeed = 0;
    double groundSpeedLength = 0;
    for (int i=m_shotStartFrame+1; i < m_kickFrames.size(); i++) {
        const ChipDetection& f = m_kickFrames.at(i);
        const Eigen::Vector3f cam = m_cameraInfo->cameraPosition.value(f.cameraId);

        const Eigen::Vector2f K(cam(0), cam(1));
        const Eigen::Vector2f P = f.ballPos;

        debugLine("sp", S(0), S(1), V(0), V(1), 1);
        debugLine("pr", K(0), K(1), P(0), P(1), 2);
        const double numerator = (K(1)-S(1))/(V(1)-S(1)) - (K(0)-S(0))/(V(0)-S(0));
        const double denominator = (P(0)-K(0))/(V(0)-S(0)) - (P(1)-K(1))/(V(1)-S(1));
        const double mu = numerator/denominator;
        const Eigen::Vector2f intersection = K + (P-K) * mu;
        debugCircle("intersection", intersection(0), intersection(1), 0.04);

        const double timeDiff = ((f.time - startTime) / NS_PER_SEC);
        const double speed = (S - intersection).norm() / timeDiff;
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

auto FlyFilter::approachPinvApply(const PinvResult &pinvRes) -> ChipReconstruction
{
    const ChipDetection firstInTheAir = m_kickFrames.at(m_shotStartFrame);
    ChipReconstruction result;
    result.chipStartPos = firstInTheAir.ballPos;
    result.chipStartTime = firstInTheAir.time;

    const float z0 = pinvRes.z0;
    const float vz = pinvRes.vz;

    result.groundSpeed = Eigen::Vector2f(pinvRes.vx, pinvRes.vy);
    result.zSpeed = pinvRes.vz;

    if (pinvRes.distStartPos < 0.06) {
        result.chipStartPos = Eigen::Vector2f(pinvRes.x0, pinvRes.y0);
    }

    const float t1 = (vz + sqrt(vz*vz + GRAVITY*z0*2)) / GRAVITY;
    const float t2 = (vz - sqrt(vz*vz + GRAVITY*z0*2)) / GRAVITY;
    const float T = (t1 < t2) ? t1 : t2;
    debug("pinv/t2", t2);
    debug("pinv/t1", t1);
    debug("pinv/T", T);

    if (std::isnan(T)) {
        debug("abort pinv", T);
        resetFlightReconstruction();
        return result;
    }

    if (pinvRes.distStartPos < 0.06) {
        if (fabs(T) < 0.08) {
            result.chipStartPos = result.chipStartPos+result.groundSpeed*T;
        }
    }

    if (fabs(T) < 0.08) {
        result.zSpeed = pinvRes.vz - GRAVITY*T;
    }

    if (fabs(T) < 0.04) { // maximum error 20ms at 50Hz
        result.chipStartTime = firstInTheAir.time + T*NS_PER_SEC;
    }
    return result;
}

auto FlyFilter::approachIntersectApply(const FlyFilter::IntersectionResult &intRes) const -> ChipReconstruction
{
    const ChipDetection firstInTheAir = m_kickFrames.at(m_shotStartFrame);
    ChipReconstruction result;
    result.chipStartPos = m_kickFrames.at(m_shotStartFrame).ballPos;
    result.chipStartTime = firstInTheAir.time-10000000.0; // -10ms, actual kick was before
    result.groundSpeed = intRes.intersectionGroundSpeed;
    result.zSpeed = intRes.intersectionZSpeed;
    debug("method intersect", true);
    debug("approx/speed length", intRes.intersectionGroundSpeed.norm());
    return result;
}

auto FlyFilter::approachAreaApply() -> ChipReconstruction
{
    const ChipDetection firstInTheAir = m_kickFrames.at(m_shotStartFrame);
    ChipReconstruction result;
    result.chipStartPos = m_kickFrames.at(m_shotStartFrame).ballPos;
    result.chipStartTime = firstInTheAir.time;
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

    double speedXSum = 0.0;
    double speedYSum = 0.0;
    const int start = m_shotStartFrame+2; // m_shotStartFrame+1 is first in the air
    const int end = m_kickFrames.size();
    for (int i=start; i<end; i++) {
        const ChipDetection& m = m_kickFrames.at(i);
        const auto timeDiff = (m.time - firstInTheAir.time) / NS_PER_SEC;
        const Eigen::Vector3f unprojPos = unproject(m, ballRadius);
        const double xDist = unprojPos(0) - firstInTheAir.ballPos(0);
        const double yDist = unprojPos(1) - firstInTheAir.ballPos(1);
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

    const double startTime = m_kickFrames.at(m_shotStartFrame).time;
    for (int i=start; i<end; i++) {
        const ChipDetection& m = m_kickFrames.at(i);
        const double time = (m.time - startTime) / NS_PER_SEC;
        const Eigen::Vector3f unprojPos = unproject(m, ballRadius);
        const double height = unprojPos(2);

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
    const Eigen::Vector2f vGroundPinv(pinvRes.vx, pinvRes.vy);
    const Eigen::Vector2f center = m_kickFrames.first().ballPos;
    const double vToProj = innerAngle(center, m_kickFrames.back().ballPos, center+vGroundPinv);
    debug("vToProjPinv", vToProj);

    const float z0 = pinvRes.z0;
    const float vz = pinvRes.vz;
    return  z0 > -0.5 && (z0 < 1 || (m_isActive && z0 < 4)) && vz > 1
            && pinvRes.distStartPos < 0.4 && vz < 10
            && (std::isnan(vToProj) || vToProj < 0.7);
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

    return angleSpeed < angleProjection && vToProj < 0.7;
}

void FlyFilter::parabolicFlightReconstruct(const PinvResult& pinvRes)
{
    if (approachPinvApplicable(pinvRes) && m_kickFrames.size() > APPROACH_SWITCH_FRAMENO) {
        debug("chip approach", "pinv");
        m_chipReconstruction = approachPinvApply(pinvRes);
        m_isActive = true;
    } else {
        const Eigen::Vector2f lastBall = m_kickFrames.back().ballPos;
        const Eigen::Vector3f cam3d = m_cameraInfo->cameraPosition.value(m_kickFrames.back().cameraId);
        const Eigen::Vector2f cam(cam3d(0), cam3d(1));
        const Eigen::Vector2f center = m_kickFrames.first().ballPos;
        const double intersectionAngle = innerAngle(center, cam, lastBall);
        debug("intersection angle", intersectionAngle);

        const IntersectionResult intRes = calcIntersection(pinvRes);

        if (intersectionAngle < 0.4) { // angle low
            debug("chip approach", "height");
            m_chipReconstruction = approachAreaApply();
            m_isActive = true;
        } else if (approachIntersectApplicable(intRes)) {
            debug("chip approach", "intersection");
            m_chipReconstruction = approachIntersectApply(intRes);
            m_isActive = true;
        } else {
            debug("chip approach", "unavailable");
            m_isActive = false;
        }
    }
}

bool FlyFilter::detectionCurviness(const PinvResult& pinvRes) const
{
    if (m_kickFrames.size() < 5) {
        return false;
    }
    if (m_kickFrames.size() < 8 && pinvRes.refSpeed < 2) {
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

    return fabs(slope) > std::max(-0.03212*m_kickFrames.size() + 0.4873, 0.06);
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
    for (auto& m : m_kickFrames) {
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
    QVector<float> speeds;
    for (int i=1; i<m_kickFrames.size(); i++) {
        if (m_kickFrames.at(i).cameraId != m_kickFrames.back().cameraId) {
            // bad geometry calibration may lead to virtual accelerations
            continue;
        }
        const double dist = (m_kickFrames.at(i).ballPos - m_kickFrames.at(i-1).ballPos).norm();
        const double timeDiff = (m_kickFrames.at(i).time-m_kickFrames.at(i-1).time) / NS_PER_SEC; //seconds
        speeds.append(dist/timeDiff);
    }
    const float avg = std::accumulate(speeds.begin(), speeds.end(), 0.0) / speeds.size();

    double xSum = 0;
    double valSum = 0;
    double xSumSq = 0;
    double valXSum = 0;
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
    double slope = (n * valXSum - xSum * valSum) / (n * xSumSq - xSum * xSum);
    slope /= valSum / n;

    debug("detection speed/slope", slope);
    debug("detection speed/avg", avg);
    debug("detection speed/last", speeds.back());

    return (slope > 0.02 && speeds.size() > 5)
            || (slope > 0.002 && speeds.size() > 14);
}

bool FlyFilter::detectionPinv(const FlyFilter::PinvResult &pinvRes) const
{
    const float z0 = pinvRes.z0;
    const float vz = pinvRes.vz;
    const Eigen::Vector2f vGroundPinv(pinvRes.vx, pinvRes.vy);

    const float maxFlightDurationHalf = vz / GRAVITY;
    const float maxFlightDuration = maxFlightDurationHalf*2;
    const float maxHeight = vz*maxFlightDurationHalf - (GRAVITY * 0.5f) *maxFlightDurationHalf*maxFlightDurationHalf;
    const double timeElapsed = (m_kickFrames.back().time - m_chipReconstruction.chipStartTime) / NS_PER_SEC;

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
            && pinvRes.distStartPos < 1
            && vGroundPinv.norm() > 1.5
            && timeElapsed < maxFlightDuration
            && maxHeight > 0.1
            && fabs(flightDistGroundCalc-flightDistMeasured) < std::min(flightDistGroundCalc, flightDistMeasured)/3
            && m_kickFrames.size() > 5;
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
    const bool isCurvy = detectionCurviness(pinvRes);
    if (m_kickFrames.front().chipCommand) {
        debug("kick command", "chip");
        return true;
    }
    if (detectionSpeed()) {
        debug("kick command", "unavailable");
        const Eigen::Vector3f cam3d = m_cameraInfo->cameraPosition.value(m_kickFrames.back().cameraId);
        const Eigen::Vector2f cam(cam3d(0), cam3d(1));
        const double angleToCam = innerAngle(m_kickFrames.first().ballPos, cam, m_kickFrames.back().ballPos);
        debug("detection/speed", true);

        if (numMeasurementsWithOwnCamera() > 10) { // MAGIC
            debug("detection/speed", true);
            return true;
        }
        debug("angle to cam", angleToCam);
        if (angleToCam > 0.45) { // MAGIC
            if (isCurvy) {
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

void FlyFilter::processVisionFrame(const VisionFrame& frame)
{
    const Eigen::Vector2f reportedBallPos(frame.x, frame.y);
    const float timeSinceInit = (frame.time - m_initTime);

    float dribblerSpeed = 0;
    float absSpeed = 0;
    if (m_shotDetectionWindow.size() > 0) {
        const float timeDiff = (timeSinceInit - m_shotDetectionWindow.back().time) / NS_PER_SEC; // seconds
        const float lastDribblerDist = (m_shotDetectionWindow.back().dribblerPos-m_shotDetectionWindow.back().ballPos).norm();
        const float dribblerDist = (frame.robot.dribblerPos - reportedBallPos).norm();
        dribblerSpeed = (dribblerDist-lastDribblerDist) / timeDiff;
        absSpeed = (reportedBallPos-m_shotDetectionWindow.back().ballPos).norm() / timeDiff;
    }

    const ChipDetection currentDetection(dribblerSpeed, absSpeed, timeSinceInit,
                        reportedBallPos, frame.robot.dribblerPos, frame.ballArea, frame.robot.robotPos,
                        frame.cameraId, frame.chipCommand, frame.linearCommand, frame.robot.identifier);
    m_shotDetectionWindow.append(currentDetection);
    if (m_shotDetectionWindow.size() > 4) {
        m_shotDetectionWindow.pop_front();
    }

    debug("chip measurements", m_kickFrames.size());

    if (m_kickFrames.empty() && checkIsShot()) {
        m_kickFrames.append(m_shotDetectionWindow.at(0));
        m_kickFrames.append(m_shotDetectionWindow.at(1));
        m_kickFrames.append(m_shotDetectionWindow.at(2));
        // currentDetection is also in m_shotDetectionWindow but will be added by chip detection
        m_shotDetectionWindow.clear();
        // we need to keep the last measurement to infer speed
        m_shotDetectionWindow.append(m_kickFrames.back());

        // use the first kick frame time as an estimate, will be refined once it is accepted as a chip
        m_chipReconstruction.chipStartTime = m_kickFrames.at(0).time;

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
        if (!m_bouncing) {
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

FlyFilter::Prediction FlyFilter::predictTrajectory(qint64 time)
{
    m_lastPredictionTime = time;
    const double flightDuration = 2*m_chipReconstruction.zSpeed / GRAVITY;
    const double t = (time - (m_chipReconstruction.chipStartTime + m_initTime)) / NS_PER_SEC;

    debug("flight duration", flightDuration);
    debug("flight time passed", t);

    m_touchdownPos = m_chipReconstruction.chipStartPos + flightDuration*m_chipReconstruction.groundSpeed;
    debugCircle("chosen pos start", m_chipReconstruction.chipStartPos(0), m_chipReconstruction.chipStartPos(1), 0.03);
    if (!std::isnan(m_touchdownPos(0)) && !std::isnan(m_touchdownPos(1))) {
        debugCircle("touchdown", m_touchdownPos(0), m_touchdownPos(1), 0.04);
    }

    bool abortBounce = false;
    if (m_isActive && t > 0.3 && t < 3 && t > flightDuration) { // check for bouncing
        if (!m_bouncing) {
            m_bounceStartTime = m_chipReconstruction.chipStartTime + flightDuration*NS_PER_SEC;
            m_bounceZSpeed = floorDamping * m_chipReconstruction.zSpeed;
            m_bounceGroundSpeed = m_chipReconstruction.groundSpeed;
            m_bouncing = true;
            m_bounceStartPos = m_touchdownPos;
        } else {
            const float bounceFlightDuration = 2*m_bounceZSpeed / GRAVITY;
            const double bounceTime = (time - (m_bounceStartTime + m_initTime)) / NS_PER_SEC;
            debug("bounce/time", bounceTime);
            if (bounceTime > bounceFlightDuration) {
                m_bounceStartTime = m_bounceStartTime + bounceFlightDuration*NS_PER_SEC;
                m_bounceStartPos = m_bounceStartPos + m_bounceGroundSpeed*bounceFlightDuration;
                m_bounceZSpeed = floorDamping * m_bounceZSpeed;
            }
            debugCircle("bounce start", m_bounceStartPos(0), m_bounceStartPos(1), 0.03);
            // if bounce height below threshold
            const float tb = bounceFlightDuration / 2;
            const float bounceHeight = m_bounceZSpeed * tb - (GRAVITY * 0.5f)*tb*tb;
            debug ("bounce/z speed", m_bounceZSpeed);
            debug ("bounce/flight duration", bounceFlightDuration);
            debug ("bounce/height", bounceHeight);

            if (bounceHeight < 0.01) {
                abortBounce = true;
            }
        }
    } else if (m_isActive && t > flightDuration) {
        debug("abort time over", true);
        //resetFlightReconstruction();
    }

    if (m_bouncing) {
        double groundSpeed = 0;
        int num = 0;
        for (int i=m_kickFrames.size()-1; i>0 && i>m_kickFrames.size()-5; i--) {
            const ChipDetection& first = m_kickFrames.at(i);
            const ChipDetection& second = m_kickFrames.front();
            groundSpeed += (first.ballPos-second.ballPos).norm() / (first.time / NS_PER_SEC - second.time / NS_PER_SEC);
            num++;
        }
        groundSpeed /= (num+2); // TODO FIXME. error lies probably in m_bounceStartTime
        m_bounceGroundSpeed = m_bounceGroundSpeed.normalized() * groundSpeed;

        debug("bounce/ground speed", m_bounceGroundSpeed.norm());
        const float bounceTime = (time - (m_bounceStartTime + m_initTime)) / NS_PER_SEC;
        const Eigen::Vector2f groundPos = m_bounceStartPos + m_bounceGroundSpeed.normalized() * groundSpeed * bounceTime;

        const double zSpeed = m_bounceZSpeed - GRAVITY * bounceTime;
        const float zPos = bounceTime * m_bounceZSpeed - 0.5f * GRAVITY * bounceTime * bounceTime;
        debug("bounce/zSpeed", zSpeed);
        debug("bounce/zPos", zPos);
        if (abortBounce || zPos < 0 ) {
            debug("abort bounce", true);
            resetFlightReconstruction();
        }
        return Prediction(groundPos, zPos, m_chipReconstruction.groundSpeed, zSpeed);
    } else {
        const Eigen::Vector2f groundPos = m_chipReconstruction.chipStartPos + m_chipReconstruction.groundSpeed * t;
        const double zSpeed = m_chipReconstruction.zSpeed -  GRAVITY * t;
        const float zPos = t * m_chipReconstruction.zSpeed - 0.5f*GRAVITY*t*t;
        return Prediction(groundPos, zPos, m_chipReconstruction.groundSpeed, zSpeed);
    }
}

bool FlyFilter::acceptDetection(const VisionFrame& frame)
{
    // acceptance depends on prediction which makes no sense when not active
    // for activation of the filter the acceptance is not necessary
    // as the ground filter will accept a ball lying at the ground
    if (!m_isActive) {
        return false;
    }
    const auto predTime = (frame.time < m_lastPredictionTime) ? m_lastPredictionTime : frame.time;
    const auto pred = predictTrajectory(predTime);
    const Eigen::Vector3f cam = m_cameraInfo->cameraPosition.value(frame.cameraId);
    const float lambda = -cam(2) / (cam(2)-pred.pos(2));
    const Eigen::Vector3f predGround = cam + (cam-pred.pos)*lambda;
    const Eigen::Vector3f ball(frame.x, frame.y, 0);

    m_acceptDist = (ball - predGround).norm();
    debug("accept dist", m_acceptDist);
    return m_acceptDist < ACCEPT_DIST;
}

static float dist(float v0, float v1, float acc)
{
    const float time = std::abs(v0 - v1) / acc;
    return 0.5f * (v0 + v1) * time;
}

void FlyFilter::writeBallState(world::Ball *ball, qint64 predictionTime, const QVector<RobotInfo> &, qint64)
{
    const Prediction& p = predictTrajectory(predictionTime);

    // maximum height that will be reached in the future by the ball
    // assume no floor damping for this approximation, therefore it can be handled in one case
    const float topHeight = p.pos.z() + dist(std::abs(p.speed.z()), 0, GRAVITY);

    // leave prediction to kalman filter for low flying balls
    if ((m_isActive && !m_bouncing) || topHeight > 0.05f) {
        ball->set_p_x(p.pos(0));
        ball->set_p_y(p.pos(1));
        ball->set_v_x(p.speed(0));
        ball->set_v_y(p.speed(1));
    } else {
        debug("hybrid filter", true);
    }
    ball->set_p_z(p.pos(2));
    ball->set_v_z(p.speed(2));
    ball->set_is_bouncing(m_bouncing);
    ball->set_touchdown_x(m_touchdownPos(0));
    ball->set_touchdown_y(m_touchdownPos(1));
}

void FlyFilter::resetFlightReconstruction()
{
    debug("RESET", true);
    m_isActive = false;
    m_chipDetected = false;
    m_bouncing = false;
    m_kickFrames.clear();
    m_flyFitter.clear();
    m_pinvDataInserted = 0;
    m_d_detailed = Eigen::VectorXf::Zero(2*MAX_FRAMES_PER_FLIGHT);
    m_D_detailed = Eigen::MatrixXf::Zero(2*MAX_FRAMES_PER_FLIGHT, 6);
    m_d_coarseControl = Eigen::VectorXf::Zero(2*MAX_FRAMES_PER_FLIGHT);
    m_D_coarseControl = Eigen::MatrixXf::Zero(2*MAX_FRAMES_PER_FLIGHT, 4);
    m_lastPredictionTime = m_initTime;
}

