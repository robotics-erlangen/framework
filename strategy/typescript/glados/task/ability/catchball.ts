import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import {FriendlyRobot} from "base/robot";
import {Path} from "base/path";
import {Vector, Position, Speed} from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";
import * as Ball from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import {Volley} from "glados/task/ability/volley"; // only for calcPhi
import * as PathHelper from "glados/trajectory/pathhelper";
import {ToTarget} from "glados/trajectory/totarget";
import {MessageBox, MessageType} from "glados/control/messaging";


// safety distance to ball
let DIST_ERROR = 0.025;
let SIDE_DEPTH = 0.015;
// reduce obstacle size by one millimeter to avoid collisions
let OBSTACLE_EPSILON = 0.001;
let OBSTACLE_PRIORITY = 28;

enum CatchMethod {
	Around,
	Stop,
	Hunt
}

interface BallLike {
	pos: Position;
	speed: Speed;
	radius: number;
}

export class CatchBall {
	private _lastReasonableBallPos: Position | undefined;
	private _catchTime: number | undefined;
	private _recalculateCatchTimeCounter: number = 0;
	private _ignoringOpponents: boolean = false;

	_robot: FriendlyRobot;
	_messaging: MessageBox;

	constructor(robot: FriendlyRobot, messaging: MessageBox) {
		this._robot = robot;
		this._messaging = messaging;
	}

	/// Tries to catch the ball, is designed for catching a moving ball
	// This ability will overwrite the ignoreBall, ignorePass, ignoreOpponentRobots
	// and disableOpponentPrediction obstacle parameters.
	// @param targetPos Vector - point to look at when having caught the ball
	// @param distanceToBall number - distance the robot should keep to the ball, only sensible for a stopped ball, defaults to 0
	// @param [targetSpeed number - intended ball speed at target]
	// @param [maxSpeed number - maximum speed of the robot]
	// @return catchTime - when we will catch the ball (relative Time)
	_catchBall (targetPos: Position, distanceToBall: number, targetSpeed?: number, maxSpeed?: number): number {
		let ball = World.Ball;
		// update catch time
		if (this._catchTime != undefined && !Ball.isAccelerating() && this._recalculateCatchTimeCounter < 20) {
			// ball is slowing down
			// update time from last frame
			this._catchTime = Math.max(0, this._catchTime - World.TimeDiff);
			this._recalculateCatchTimeCounter = this._recalculateCatchTimeCounter + 1;
		} else {
			// reset time as the ball is accelerating
			// should estimate the time quite good, but not overestimate it
			let ms = maxSpeed != undefined ? maxSpeed : this._robot.maxSpeed;
			let newCatchtime = Physics.robotTimeToBall(this._robot, ball, targetPos, ms, this._catchTime);
			if (this._catchTime == undefined || newCatchtime < this._catchTime - 0.3) {
				this._catchTime = newCatchtime;
			}
			this._recalculateCatchTimeCounter = 0;
		}

		// limit catch time to be inside the field
		let timeLimit = Physics.ballOutTime(ball, -0.02);
		this._catchTime = Math.min(timeLimit, this._catchTime);

		// check for fast ball and that it moves towards the robot
		// in principle this isn't neccessary but it stabilizes the catchtime
		let hitTime = this._calculateHitTime(ball);
		let ballInsideRobot = false;
		if (!Ball.isSlowBall() || hitTime == 0) {
			// check if robot would be hit by the ball
			this._catchTime = Math.min(this._catchTime, hitTime);
			if (hitTime == 0) {
				ballInsideRobot = true;
			}
		}

		this._updateReasonableBallPos(ball, ballInsideRobot);

		// predict ball and catch it
		let predictedBall = Physics.ballAtTime(ball, this._catchTime);
		if (ballInsideRobot || predictedBall.pos.isNan() || predictedBall.speed.isNan()) {
			predictedBall = { pos: <Position>this._lastReasonableBallPos, speed: new Vector(0, 0), maxSpeed: ball.maxSpeed, radius: ball.radius };
		}

		// catching the ball only makes sense if we really try to
		// a distance other than 0 is only useful for moving to a stopped ball
		distanceToBall = distanceToBall || 0;
		let viewDir = (targetPos - predictedBall.pos).angle();
		if (targetSpeed != undefined && !Ball.isSlowBall()) {
			let targetDir = Volley.calcPhi(this._robot, predictedBall.speed, predictedBall.pos,
					targetPos, targetSpeed)[0];
			viewDir = targetDir;
		}

		// QUICKFIX to prevent hish speed movement towards defenseArea
		if (predictedBall.pos
				 &&  !Field.isInAllowedField(predictedBall.pos, World.Ball.radius)
				 &&  this._robot != World.FriendlyKeeper
				 &&  World.RefereeState != "BallPlacementOffensive") {
			predictedBall.pos = Field.limitToAllowedField(predictedBall.pos, World.Ball.radius);
		}
		let moveDest = predictedBall.pos - Vector.fromAngle(viewDir).scaleLength(
					this._robot.radius + distanceToBall + ball.radius);

		if (World.Ball.pos.distanceTo(this._robot.pos) < World.Ball.radius + this._robot.radius + 0.1) {
			this._ignoringOpponents = true;
		} else if (World.Ball.pos.distanceTo(this._robot.pos) < 1) {
			if (this._robot.speed.length() < 1) {
				this._ignoringOpponents = true;
			} else if (this._robot.speed.length() > 1.5) {
				this._ignoringOpponents = false;
			}
		} else {
			this._ignoringOpponents = false;
		}

		let aggressiveMovement = (this._robot.pos.distanceTo(moveDest) < 0.5);
	    PathHelper.setObstacleParam(this._robot, PathHelper.ParameterType.disableOpponentPrediction, aggressiveMovement);
	    PathHelper.setObstacleParam(this._robot, PathHelper.ParameterType.ignoreOpponentRobots, this._ignoringOpponents);
	    PathHelper.setObstacleParam(this._robot, PathHelper.ParameterType.ignoreBall, true);
	    PathHelper.setObstacleParam(this._robot, PathHelper.ParameterType.ignorePass, true);

		let method = this._ballCatchMethod(ball, predictedBall, moveDest);
		if (method == CatchMethod.Around) {
			// just be pessimistic and assume the robot could touch the ball right from the start
			// this prevents switching the side around which a moving ball is circumnavigated
			this._createMoveAroundBallObstacle(this._robot.path, moveDest, ball, predictedBall);
			this._createBallCorridor(this._robot.path, viewDir, predictedBall);
		} else if (method == CatchMethod.Hunt) {
			this._createHuntingBallObstacle(this._robot.path, viewDir, predictedBall);
			this._createBallCorridor(this._robot.path, viewDir, predictedBall);
		}


		// move to the predicted ball
		this._robot.trajectory.update(ToTarget, moveDest, viewDir, maxSpeed);
		let time = Physics.robotTimeToPos(this._robot, moveDest, new Vector(0, 0))[0];
		this._messaging.sendBroadcast(MessageType.moveDest, moveDest);
		this._messaging.sendBroadcast(MessageType.attackPosition, predictedBall.pos);

		// damp large value changes
		// the centerpiece of the catchball algorithm
		// FIXME better damping for small changes
		if (time < this._catchTime) {
			this._catchTime = 0.8 * this._catchTime + 0.2 * time;
		} else {
			// required for moving around the ball
			this._catchTime = time;
		}
		debug.set("CatchBall/method", method);
		debug.set("CatchBall/time", time);
		debug.set("CatchBall/catchtime", this._catchTime);
		debug.set("CatchBall/ballInsideRobot", ballInsideRobot);
		vis.addCircle("t/a/catchball: CatchBall", Physics.ballAtTime(ball, this._catchTime).pos, predictedBall.radius, vis.colors.blueHalf);

		return this._catchTime;
	}

	_calculateHitTime (ball: BallLike & {maxSpeed: number}) {
		// first check if the ball is inside the robot
		if (ball.pos.distanceTo(this._robot.pos) < this._robot.radius + ball.radius) {
			// that means the ball is about to be reflected by the robot
			return 0;
			// 0 catchtime prevents the robot from driving away from the ball
		}

		// ball moves away from robot
		if (ball.speed.dot(this._robot.pos - ball.pos) <= 0) {
			return Infinity;
		}

		// check if robot would be hit by the ball
		// limit catchTime to the time the ball would need to hit the robot
		// prevents the robot from fleeing from the ball
		let [hitPoint, hitPoint2] = geom.intersectLineCircle(ball.pos,
			ball.speed, this._robot.pos, this._robot.radius + ball.radius);
		if (hitPoint == undefined) {
			return Infinity;
		}

		// find intersection with circle
		let rollDist = ball.pos.distanceTo(hitPoint);
		if (hitPoint2) {
			let dist = ball.pos.distanceTo(hitPoint2);
			if (dist < rollDist) {
				rollDist = dist;
				hitPoint = hitPoint2;
			}
		}
		vis.addCircle("t/a/catchball: hitRobot", hitPoint, ball.radius, vis.colors.redHalf, true);

		// consider that the shootRadius is less than radius and thus the ball has to travel further
		let dribberAngleHalf = Math.atan2(this._robot.dribblerWidth/2 - ball.radius, this._robot.shootRadius);
		// check whether the hitpoint could be inside the dribbler
		if (Math.abs(geom.getAngleDiff((hitPoint - this._robot.pos).angle(), this._robot.dir)) < dribberAngleHalf) {
			// calculate where the ball would hit the dribbler
			// just use the current robot dir as any prediction will be just as wrong
			let dribblerMid = this._robot.pos + Vector.fromAngle(this._robot.dir).scaleLength(this._robot.shootRadius);
			// points along the dribbler
			let dribblerDir = Vector.fromAngle(this._robot.dir).perpendicular().scaleLength(this._robot.dribblerWidth / 2 - ball.radius);
			let [intersection, _, lambda2] = geom.intersectLineLine(ball.pos, ball.speed, dribblerMid, dribblerDir);
			// abs(lambda2) <= 1 if intersection is inside the dribbler width
			if (intersection != undefined && Math.abs(lambda2) <= 1) {
				hitPoint = intersection;
				rollDist = ball.pos.distanceTo(hitPoint);
			}
		}

		// ballRollTime and atTime have to be consistent!
		// assumes that the robot is standing still or moving towards the ball
		// if the robot is fleeing this will cause it to stop moving away
		let timeToRobot = Physics.ballRollTime(ball, rollDist);
		// timeToRobot is the upper bound for the catch time, musn't be an underestimation
		// can be much lower if the robot moves towards the ball
		return timeToRobot;
	}

	limitEndSpeedToField (moveDest: Position, endSpeed: Speed): Speed {
		let endSpeedLength = endSpeed.length();
		if (endSpeed.length() > 0.01) {
			let extrapolatedRobot = {
				pos: moveDest,
				speed: endSpeed,
				acceleration: this._robot.acceleration
			};
			let extrapolatedPos = Physics.robotBrakePos(extrapolatedRobot);
			let extraDistance = 0;
			if (!Field.isInAllowedField(moveDest, -extraDistance)) {
				endSpeedLength = 0;
			} else if (!Field.isInAllowedField(extrapolatedPos, extraDistance)) {
				let nextLineCutLambda = Field.nextAllowedFieldLineCut(moveDest, endSpeed, extraDistance)[1];
				endSpeedLength = Math.min(Math.sqrt(2 * this._robot.acceleration.aBrakeFMax * nextLineCutLambda), endSpeedLength);
			}
		}
		return endSpeed.copy().setLength(endSpeedLength);
	}

	_updateReasonableBallPos (ball: BallLike, ballInsideRobot: boolean) {
		// the current prediction model doesn't acoount for collisions, so avoid prediction of the ball state after a collision
		if (!ballInsideRobot) {
			this._lastReasonableBallPos = ball.pos;
		} else if (this._lastReasonableBallPos == undefined) {
			// try to come up with a sensible position
			let [hitPoint1, hitPoint2] = geom.intersectLineCircle(ball.pos, ball.speed, this._robot.pos, this._robot.radius + ball.radius);
			if (hitPoint1 == undefined || hitPoint2 == undefined) {
				// fallback
				this._lastReasonableBallPos = ball.pos;
			} else if ((hitPoint1 - ball.pos).dot(ball.speed) > 0) {
				this._lastReasonableBallPos = hitPoint2;
			} else {
				this._lastReasonableBallPos = hitPoint1;
			}
		}
	}

	_ballCatchMethod (currentBall: BallLike, predictedBall: BallLike, moveDest: Position): CatchMethod {
		// check whether the robot is stopping, moving around or hunting the ball
		let robotTargetDist = this._robot.pos.distanceTo(moveDest);
		// distance minus robot and ball radius thus the ball is for sure between the robot and the catch pos
		let robotTargetSpacing = Math.max(0, robotTargetDist - this._robot.radius - currentBall.radius);

		let [_, _2, lambda1, lambda2, lambda3, lambda4] = geom.intersectLineCorridor(currentBall.pos, predictedBall.pos - currentBall.pos,
				this._robot.pos, moveDest - this._robot.pos, this._robot.shootRadius + World.Ball.radius - 0.005);
		let ballHit = lambda1 != undefined ? (lambda1 >= 0 && lambda1 <= 1) : lambda2 != undefined && (lambda2 >= 0 && lambda2 <= 1);
		let robotHit = lambda3 != undefined ? (lambda3 >= 0 && lambda3 <= 1) : lambda4 != undefined && (lambda4 >= 0 && lambda4 <= 1);

		let robotMovement = moveDest.distanceToSq(this._robot.pos) > this._robot.radius * this._robot.radius
								 &&  moveDest - this._robot.pos
								 ||  this._robot.speed;

		if (ballHit ? robotHit : lambda2 == Infinity && lambda4 == Infinity
			 ||  (robotMovement.absoluteAngleDiff(World.Ball.pos - moveDest) > 87/180*Math.PI)) {
			// the robot has to move around the predicted ball to reach the catch pos
			return CatchMethod.Around;
		} else if (moveDest.distanceTo(currentBall.pos) > robotTargetSpacing
			// the ball is not between the robot and the catch pos
			// the ball hasn't yet moved past the robot (TODO better calculation than the dot product?)
				 ||  (currentBall.pos - this._robot.pos).dot(predictedBall.pos - currentBall.pos) <= 0) {
			return CatchMethod.Stop;
		} else {
			return CatchMethod.Hunt;
		}
	}

	_createMoveAroundBallObstacle (path: Path, moveDest: Position, minBall: BallLike, predictedBall: BallLike) {
		let ballDist = predictedBall.pos.distanceTo(minBall.pos);
		// block connection between first touch point and target catch pos
		if (ballDist > OBSTACLE_EPSILON) {
			let ball = World.Ball;
			let extraDist = Math.min(ballDist, DIST_ERROR) / 2 - OBSTACLE_EPSILON;

			let robotDistToPredictedBall = this._robot.pos.distanceTo(predictedBall.pos);
			let ballDistToPredictedBall = ball.pos.distanceTo(predictedBall.pos);

			let lineDir = (minBall.pos - predictedBall.pos).setLength(extraDist);
			let minBallShift = minBall.pos - lineDir;
			// predictedBallShift should be tangential to the ball in the direction where the robot will be
			let predictedBallShift = predictedBall.pos + (predictedBall.pos - moveDest).setLength(extraDist);

			// if the robot is closer to the predicted ball then the ball I can shorten the obstacle
			if ((robotDistToPredictedBall + 2 * this._robot.radius + ball.radius) < ballDistToPredictedBall
				 ||  robotDistToPredictedBall < 2 * this._robot.radius + minBall.radius) {
				predictedBallShift = minBall.pos - (minBall.pos - predictedBall.pos).setLength(ball.radius + 0.02);
			}

			path.addLine(predictedBallShift.x, predictedBallShift.y, minBallShift.x, minBallShift.y,
					predictedBall.radius - OBSTACLE_EPSILON + extraDist, 'ball', OBSTACLE_PRIORITY);
			vis.addPath("t/a/catchball: CatchBall", [predictedBallShift, minBallShift], vis.colors.greenHalf, undefined, undefined, 2*(predictedBall.radius - OBSTACLE_EPSILON + extraDist));

			// prevent robot from colliding with the ball
			// calculate distance of ball connection line projected on the robot direction
			// in case the robot is hunting the ball, robot ball dist is bounded to zero
			let robotDir = geom.getAngleDiff((minBall.pos - predictedBall.pos).angle(), this._robot.dir)
			let robotBallDist = Math.max(Math.cos(robotDir) * ballDist, 0);
			// maximum error cause by moddeling the robot as circle
			let obstacleErrorDist = this._robot.radius - this._robot.shootRadius + DIST_ERROR;
			// if both predictions are near each othe the robot must still be able to reach predictedBall
			let antiCollisionDist = Math.min(obstacleErrorDist, robotBallDist);
	        // PAULTAG obstacle um den ball nicht umzufahren
			path.addCircle(minBall.pos.x, minBall.pos.y, minBall.radius - OBSTACLE_EPSILON + antiCollisionDist, 'ball2', OBSTACLE_PRIORITY);
			vis.addCircle("t/a/catchball: CatchBall", minBall.pos, minBall.radius + antiCollisionDist, vis.colors.redHalf);
		} else {
			// no need to prevent collision with minBall, if both are the same
	        // PAULTAG obstacle um den ball nicht umzufahren wenn predicted position und aktuelle nicht so auseinander liegen -> kein schlauch
			path.addCircle(predictedBall.pos.x, predictedBall.pos.y, predictedBall.radius - OBSTACLE_EPSILON, 'ball', OBSTACLE_PRIORITY);
		}
		vis.addCircle("t/a/catchball: CatchBall", predictedBall.pos, predictedBall.radius, vis.colors.greenHalf);

	}

	_createHuntingBallObstacle (path: Path, viewDir: number, predictedBall: BallLike) {
		path.addCircle(predictedBall.pos.x, predictedBall.pos.y, predictedBall.radius - OBSTACLE_EPSILON, 'ball', OBSTACLE_PRIORITY);
		vis.addCircle("t/a/catchball: CatchBall", predictedBall.pos, predictedBall.radius, vis.colors.skyBlueHalf);

		let frontEnd = predictedBall.pos + Vector.fromAngle(viewDir) * 0.3;
		path.addLine(predictedBall.pos.x, predictedBall.pos.y, frontEnd.x, frontEnd.y, predictedBall.radius - OBSTACLE_EPSILON, 'ballForward', OBSTACLE_PRIORITY);
		vis.addPath("t/a/catchball: CatchBall", [predictedBall.pos, frontEnd], vis.colors.skyBlueHalf, undefined, undefined, 2*(predictedBall.radius - OBSTACLE_EPSILON));
	}

	_createBallCorridor (path: Path, viewDir: number, predictedBall: BallLike) {
		// bracket to prevent hitting the ball with the robots side / back
		let obstacleErrorDist = this._robot.radius - this._robot.shootRadius + DIST_ERROR;
		let corridorRadius = predictedBall.radius;

		// create a bracket that ensures a minimum distance of obstacleErroDist to the ball
		// except on the side indicated by viewDir
		let rightOfs = Vector.fromAngle(viewDir).perpendicular().scaleLength(obstacleErrorDist);
		let depthOfs = Vector.fromAngle(viewDir).scaleLength(obstacleErrorDist);

		let corridorLeftNear = predictedBall.pos - rightOfs;
		let corridorLeftFar = corridorLeftNear + depthOfs;
		let corridorRightNear = predictedBall.pos + rightOfs;
		let corridorRightFar = corridorRightNear + depthOfs;
		if (Ball.isSlowBall()) {
			path.addLine(corridorLeftNear.x, corridorLeftNear.y, corridorLeftFar.x, corridorLeftFar.y, corridorRadius, "ball_corridor1", OBSTACLE_PRIORITY);
			path.addLine(corridorLeftFar.x, corridorLeftFar.y, corridorRightFar.x, corridorRightFar.y, corridorRadius, "ball_corridor2", OBSTACLE_PRIORITY);
			path.addLine(corridorRightFar.x, corridorRightFar.y, corridorRightNear.x, corridorRightNear.y, corridorRadius, "ball_corridor3", OBSTACLE_PRIORITY);

			// visualize obstacles
			vis.addPath("t/a/catchball: MoveCorridor", [corridorLeftNear, corridorLeftFar, corridorRightFar, corridorRightNear], vis.colors.redHalf, undefined, undefined, 2*corridorRadius);
		}
		// bracket with negative obstacle radius, enforces approaching the ball from behind
		// Obstacle checking is done as: distance(robot, obstacle) < robot.radius + obstacle.radius
		// Negative obstacle radius allow to keep the robot center constrainted without blocking large portions of the field
		let effectiveObstacleRadius = this._robot.radius;
		let negativeRadius = - this._robot.radius + effectiveObstacleRadius;
		let moveWidth = this._robot.dribblerWidth + 2 * SIDE_DEPTH;

		let negRightOfs = Vector.fromAngle(viewDir).perpendicular().scaleLength(moveWidth/2);
		let negBaseDepthOfs = Vector.fromAngle(viewDir).scaleLength(negativeRadius-predictedBall.radius+0.005);

		let negLeftFar = predictedBall.pos - negRightOfs + negBaseDepthOfs;
		let negRightFar = predictedBall.pos + negRightOfs + negBaseDepthOfs;

		if (Ball.isSlowBall()) {
			path.addLine(negLeftFar.x, negLeftFar.y, negRightFar.x, negRightFar.y, negativeRadius, "ball_negcorridor2", OBSTACLE_PRIORITY);

			// visualize obstacles
			vis.addPath("t/a/catchball: NegMoveCorridor", [negLeftFar, negRightFar], vis.colors.orangeHalf, undefined, undefined, 2*effectiveObstacleRadius);
		}
	}
}