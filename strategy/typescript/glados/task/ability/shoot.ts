import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import * as Referee from "base/referee";
import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { MessageBox, MessageType } from "glados/control/messaging";
import * as Ball from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
import * as ObserverShoot from "glados/observer/shoot";
import { CatchBall } from "glados/task/ability/catchball";
import { ForceShoot } from "glados/task/ability/forceshoot";
import { Volley } from "glados/task/ability/volley";
import { CurvedMaxAccel } from "glados/trajectory/curvedmaxaccel";
import { Direct as TrajectoryDirect } from "glados/trajectory/direct";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";
import * as Rating from "glados/util/rating";


/**
 * If the ball speed is lower than RESTING_BALL_SPEED
 * the ball is resting or at least very slow
 */
const RESTING_BALL_SPEED = 0.2;
const RESTING_BALL_SPEED_HYST = 0.1;

/**
 * If the ball speed is lower than WOBBLING_BALL_SPEED
 * the ball is probably resting
 */
const WOBBLING_BALL_SPEED = 0.4;
const WOBBLING_BALL_SPEED_HYST = 0.2;

/*
 * If the ball movement direction and the shoot direction differ less than CHASE_BALL_ANGLE
 * we chase the ball instead of stopping it
 */
const CHASE_BALL_ANGLE = 70 * Math.PI / 180;
const CHASE_BALL_ANGLE_HYST = 5 * Math.PI / 180;
const CHASE_BALL_SIDE_SPEED = 1.25;
const CHASE_BALL_SIDE_SPEED_HYST = 0.25;

/**
 * if inverse ball movement direction and the shoot direction differ less than VOLLEY_ANGLE
 * we can shoot the ball as soon as it touches the dribbler instead of stopping it
 */
const VOLLEY_ANGLE = 70 * Math.PI / 180;
const VOLLEY_ANGLE_HYST = 5 * Math.PI / 180;
const VOLLEY_ENABLED = true;

// direct movement
const EXTRA_MOVE_SPEED_LIMIT = 0.5;
const SIDEWARDS_KP = 9;
const SIDEWARDS_KI = 2.4;
const SIDEWARDS_SPEED_LIMIT = 0.5;

/** chip distance scaling factor for passes */
const CHIP_PASS_DISTANCE_FACTOR = 0.4;

/**
 * if the robot view direction and the shoot direction differ less than MIN_PRECISION
 * the robot is allowed to shoot the ball
 */
const MIN_PRECISION = 3.5 * Math.PI / 180;
const MIN_PRECISION_CHASE = 6 * Math.PI / 180;

enum ShootState {
	StationaryBall = "StationaryBall", ChaseBall = "ChaseBall", Volley = "Volley", StopBall = "StopBall", Unknown = "Unknown"
}

export class Shoot {
	_state: ShootState = ShootState.Unknown;

	// direct movement
	_directExtraSpeed: number = 0;
	_sideOffsetErrorSum: number = 0;

	_lastTargetPos: Position | undefined;
	_linearShoot: boolean = true;
	targetRobotDir: number = 0;

	_precision: number = 0;
	_rightOrientation: boolean = false;

	_lastBallInsideRobotTime: number = 0;
	_directMovement: boolean = false;
	_catchBallActive: boolean = false;

	_robot: FriendlyRobot;
	_messaging: MessageBox;

	_catchBall: CatchBall;
	_forceShoot: ForceShoot;
	_setMainAttackerParameters: (target: Position, endSpeedLength: number) => void;

	constructor(robot: FriendlyRobot, messaging: MessageBox, setMAParams: (target: Position, endSpeedLength: number) => void) {
		this._robot = robot;
		this._messaging = messaging;
		this._catchBall = new CatchBall(robot, messaging);
		this._forceShoot = new ForceShoot(robot);
		this._setMainAttackerParameters = setMAParams;
	}

	private _setObstacles(moveDest?: Position) {
		let ignoreRobots = this._robot.speed.length() < 1;
		PathHelper.setObstacleParam(this._robot, PathHelper.ParameterType.ignoreBall, true);
		PathHelper.setObstacleParam(this._robot, PathHelper.ParameterType.ignorePass, true);
		PathHelper.setObstacleParam(this._robot, PathHelper.ParameterType.ignoreFriendlyRobots, ignoreRobots);
		PathHelper.setObstacleParam(this._robot, PathHelper.ParameterType.ignoreOpponentRobots, ignoreRobots);

		if (moveDest != undefined) {
			let distToBall = moveDest.distanceTo(World.Ball.pos);
			let obstacleSize = Rating.valueToRating(distToBall, 0.2, 0.4) * (World.Ball.radius + 0.01);
			if (obstacleSize > 0) {
				this._robot.path.addCircle(World.Ball.pos.x, World.Ball.pos.y, obstacleSize, "t/a/shoot ball", PathHelper.Priorities.BALL);
			}
		}
	}

	private _calculateFutureBall(ballReceiptPos?: Position): [Physics.BallLike, number] {
		let futureBallPos: Position;

		if (World.Ball.speed.length() > 0.1) {
			if (ballReceiptPos != undefined && (ballReceiptPos - World.Ball.pos).dot(World.Ball.speed) > 0) {
				futureBallPos = ballReceiptPos.orthogonalProjection(World.Ball.pos, World.Ball.pos + World.Ball.speed)[0];
			} else {
				let dribblerPos = this._robot.pos + Vector.fromPolar(this._robot.dir, this._robot.shootRadius + World.Ball.radius);
				futureBallPos = dribblerPos.nearestPosOnLine(World.Ball.pos, World.Ball.pos + World.Ball.speed * 3);
			}
		} else {
			futureBallPos = World.Ball.pos;
		}

		futureBallPos = Field.limitToAllowedField(futureBallPos, World.Ball.radius - 0.05);

		let ballTime = Math.max(0, Physics.checkedBallTravelTime(World.Ball, <Position> futureBallPos));
		let futureBall = Physics.ballAtTime(World.Ball, ballTime);

		// if futureBall.pos.distanceTo(this._robot.pos) < this._robot.shootRadius + World.Ball.radius then
		// end

		if (World.Ball.pos.distanceTo(this._robot.pos) < this._robot.shootRadius + World.Ball.radius) {
			futureBall.pos = this._robot.pos + Vector.fromPolar(this._robot.dir, this._robot.shootRadius + World.Ball.radius);
			this._lastBallInsideRobotTime = World.Time;
		}

		if (ballReceiptPos) {
			vis.addCircle("t/a/shoot: ballReceiptPos", ballReceiptPos, 0.04, vis.colors.magentaHalf, true);
		}
		vis.addCircle("t/a/shoot: futureBall", futureBall.pos, futureBall.radius, vis.colors.orangeHalf, true);

		return [futureBall, Math.max(0, ballTime)];
	}

	private _catchBallNecessary(moveDest: Position, futureBallTime: number): boolean {
		if (Robot.hadBall(this._robot, 0)) {
			return false;
		}

		let robotTime = Physics.robotTimeToPos(this._robot, moveDest, new Vector(0, 0))[0];
		if (robotTime < futureBallTime + 0.1) {
			return false;
		}

		if (!this._catchBallActive && robotTime < 0.7 && World.Ball.speed.lengthSq() > 0.3
				&&  World.Ball.speed.dot(this._robot.pos - World.Ball.pos) > 0) {
			return false;
		}

		return true;
	}

	private _getState(targetPos: Position, futureBall: Physics.BallLike, futureBallTime: number,
			targetTime: number | undefined, chaseFutureBall: Physics.BallLike): ShootState {
		// check if the ball can be chased
		let restingBallSpeed = RESTING_BALL_SPEED + (this._state === ShootState.ChaseBall ? -1 : 1) * RESTING_BALL_SPEED_HYST;
		let shootVector = targetPos - chaseFutureBall.pos;
		let angleDiff = chaseFutureBall.speed.absoluteAngleDiff(shootVector);
		let relativeBallPos = World.Ball.pos - this._robot.pos;
		let sidewardsVector = shootVector.perpendicular().normalized();
		let sidewardsBallSpeed = World.Ball.speed.dot(sidewardsVector);
		let chaseBallAngle = CHASE_BALL_ANGLE + (this._state === ShootState.ChaseBall ? 1 : -1) * CHASE_BALL_ANGLE_HYST;
		let sidewardsSpeedLimit = CHASE_BALL_SIDE_SPEED + (this._state === ShootState.ChaseBall ? 1 : -1) * CHASE_BALL_SIDE_SPEED_HYST;
		if (chaseFutureBall.speed.length() > restingBallSpeed
				&& angleDiff < chaseBallAngle && (World.Ball.speed.dot(relativeBallPos) > 0 || World.Ball.posZ > 0)
				&& World.Ball.speed.dot(chaseFutureBall.pos - this._robot.pos) > 0
				&& sidewardsBallSpeed < sidewardsSpeedLimit
				&& !Field.isInOpponentDefenseArea(World.Ball.pos, 0)) {
			return ShootState.ChaseBall;
		}

		// check if the ball is stationary
		let wobblingBallSpeed = WOBBLING_BALL_SPEED + (this._state === ShootState.StationaryBall ? 1 : -1) * WOBBLING_BALL_SPEED_HYST;
		if (!Ball.wasShot(0.5) && futureBall.speed.length() < wobblingBallSpeed) {
			return ShootState.StationaryBall;
		}

		// if the targetPos changed significantly, reset to stopBall
		if (this._lastTargetPos && targetPos.distanceTo(this._lastTargetPos) > 0.05 && futureBallTime > 0.35) {
			this._state = ShootState.StopBall;
		}

		// don't redecide if the ball is very close
		if (this._state !== ShootState.Unknown && futureBallTime < 0.3) {
			return this._state;
		}

		// check if the ball can be shot volley
		let volleyAngle = VOLLEY_ANGLE + (this._state === ShootState.Volley ? 1 : -1) * VOLLEY_ANGLE_HYST;
		shootVector = targetPos - futureBall.pos;
		angleDiff = futureBall.speed.absoluteAngleDiff(shootVector);
		if (VOLLEY_ENABLED && (Math.PI - angleDiff < volleyAngle)) {
			let passTravelTime = ObserverShoot.ballPassTime(futureBall.pos, targetPos, undefined, undefined, this._robot);
			let bufferTime = this._state === ShootState.Volley ? 0.3 : 0;
			if (targetTime == undefined || World.Time + futureBallTime + passTravelTime + bufferTime > targetTime) {
				return ShootState.Volley;
			}
		}

		// otherwise stop the ball
		return ShootState.StopBall;
	}

	private _correctSidewardsOffset(): Vector {
		let distToBall = (World.Ball.pos - this._robot.pos).rotate(-this._robot.dir);
		distToBall.x = distToBall.x - this._robot.shootRadius - World.Ball.radius - 0.01;

		let p_out = SIDEWARDS_KP * -distToBall.y;
		let errorMax = MathUtil.bound(0, SIDEWARDS_SPEED_LIMIT - p_out, SIDEWARDS_SPEED_LIMIT);
		let errorMin = MathUtil.bound(-SIDEWARDS_SPEED_LIMIT, -SIDEWARDS_SPEED_LIMIT - p_out, 0);
		this._sideOffsetErrorSum = MathUtil.bound(errorMin, this._sideOffsetErrorSum + SIDEWARDS_KI * p_out * World.TimeDiff, errorMax);
		debug.set("Shoot/sideIntegral", this._sideOffsetErrorSum);

		// correct sidewards pos error
		let resLength = MathUtil.bound(-SIDEWARDS_SPEED_LIMIT, p_out + this._sideOffsetErrorSum, SIDEWARDS_SPEED_LIMIT);
		return Vector.fromPolar(this._robot.dir, resLength).perpendicular();
	}

	private _sendShootCommand(kickSpeed: number, targetPos: Position, targetDir: number) {
		let angleDiff = Math.abs(geom.normalizeAngle(this._robot.dir - targetDir));
		debug.set("Shoot/angleDiff (degrees)", angleDiff * 180 / Math.PI);

		let threshhold = this._precision * (this._rightOrientation ? 1.2 : 0.8);
		this._rightOrientation = angleDiff < threshhold;
		debug.set("Shoot/rightOrientation", this._rightOrientation);

		if (this._rightOrientation) {
			debug.set("Shoot/shootCommand", this._linearShoot ? "linear" : "chip");
			if (this._linearShoot) {
				this._robot.shoot(kickSpeed, true);
			} else {
				let dist = World.Ball.pos.distanceTo(targetPos);
				this._robot.chip(dist);
			}
		}
	}

	private _shootStationaryBall(targetPos: Position, targetSpeed: number, targetTime: number | undefined, futureBall: Physics.BallLike) {
		let shootDir = (targetPos - this._robot.pos).angle();
		this.targetRobotDir = shootDir;

		let maxSidewardsAngle;
		let maxOrientationAngle;
		let minCatchBallDistance;
		let hasBallDistance;
		let speedupFactor;

		if (Referee.isFriendlyFreeKickState() || Referee.isFriendlyKickoffState() || World.RefereeState === "BallPlacementOffensive") {
			maxSidewardsAngle = 30 * Math.PI / 180;
			maxOrientationAngle = 2 * Math.PI / 180;
			minCatchBallDistance = 0.01;
			hasBallDistance = 0.04;
			speedupFactor = 0.4;
		} else {
			maxSidewardsAngle = 30 * Math.PI / 180;
			maxOrientationAngle = 8 * Math.PI / 180;
			minCatchBallDistance = 0.00;
			hasBallDistance = 0.1;
			speedupFactor = 0.8;
		}

		// hysteresis to cope with mediocre vision
		if (this._directMovement) {
			maxSidewardsAngle = maxSidewardsAngle * 1.5;
			maxOrientationAngle = maxOrientationAngle * 1.5;
			hasBallDistance = hasBallDistance * 1.5;
		}

		let ballInDefense = Field.isInOpponentDefenseArea(World.Ball.pos, World.Ball.radius +
				(this._directMovement ? 0.01 : 0.03)) &&
			World.RefereeState !== "BallPlacementOffensive" &&
			this._robot !== World.FriendlyKeeper;

		let hasBallSideOffset = this._directMovement ? 0.02 : 0;
		this._directMovement = this._robot.hasBall(World.Ball, hasBallSideOffset, hasBallDistance)
			&&  Math.abs(geom.normalizeAngle((World.Ball.pos - this._robot.pos).angle() - shootDir)) < maxSidewardsAngle
			&&  Math.abs(geom.normalizeAngle(this._robot.dir - shootDir)) < maxOrientationAngle
			&& !ballInDefense;

		debug.set("Shoot/AngleError", geom.normalizeAngle(Math.abs(this._robot.dir - shootDir)) * 180 / Math.PI);

		let [targetDir, kickSpeed] = Volley.calcPhi(this._robot, futureBall.speed, futureBall.pos, targetPos, targetSpeed); // TODO: calcPhi with stopped ball is questionable
		let ballTravelTime = undefined;
		if (targetTime != undefined) {
			let kickSpeedVector = (targetPos - futureBall.pos).withLength(kickSpeed);
			let shootBall = { maxSpeed: kickSpeed, speed: kickSpeedVector };
			let ballTime: number = Physics.ballRollTime(shootBall, futureBall.pos.distanceTo(targetPos));
			if (World.Time + 0.2 + ballTime < targetTime) {
				this._directMovement = false;
			}
			ballTravelTime = ballTime;
		}

		let attackTime: number = 0; // Will be overridden.
		if (targetTime != undefined) {
			attackTime = targetTime - ballTravelTime!;
		}
		if (this._directMovement) {
			let accelerate = this._robot.acceleration.aSpeedupFMax * speedupFactor;
			this._directExtraSpeed = Math.min(this._directExtraSpeed + accelerate * World.TimeDiff, EXTRA_MOVE_SPEED_LIMIT);
			let accel = Vector.fromPolar(targetDir, accelerate);
			let speed = Vector.fromPolar(targetDir, this._directExtraSpeed);

			speed = speed + this._correctSidewardsOffset();

			debug.set("Shoot/directSpeed", speed);
			debug.set("Shoot/directDir", targetDir);
			debug.set("Shoot/directAccel", accel);
			this._setObstacles(undefined);
			this._robot.trajectory.update(TrajectoryDirect, speed, targetDir, undefined, accel);
			this._sendShootCommand(kickSpeed, targetPos, targetDir);
			this._messaging.sendBroadcast(MessageType.attackPosition, futureBall.pos);
			if (attackTime < World.Time) {
				attackTime = World.Time;
			}
			this._catchBallActive = false;
			this._messaging.sendBroadcast(MessageType.earliestAttackTime, World.Time);
		} else {
			let cBTime = this._catchBall._catchBall(targetPos, minCatchBallDistance, targetSpeed);
			this._messaging.sendBroadcast(MessageType.earliestAttackTime, World.Time + cBTime);
			if (attackTime < World.Time + cBTime) {
				attackTime = World.Time + cBTime;
			}
			this._catchBallActive = true;
		}
		this._messaging.sendBroadcast(MessageType.plannedAttackTime, attackTime);

		debug.set("Shoot/DirectMovement", this._directMovement);
	}

	private _calculateChaseFutureBall(targetPos: Position) {
		let dribblerOffset = (targetPos - World.Ball.pos).withLength(this._robot.shootRadius + World.Ball.radius);
		let moveDest = World.Ball.pos - dribblerOffset;
		let moveTime = moveDest.distanceTo(this._robot.pos) / Math.min(this._robot.speed.length(), 1);
		let futureBall =  Physics.ballAtTime(World.Ball, moveTime);
		vis.addCircle("t/a/shoot chase future ball", futureBall.pos, 0.03, vis.colors.orange);
		return futureBall;
	}

	private _shootChaseBall(targetPos: Position, targetSpeed: number, futureBall: Physics.BallLike) {
		let relativeEndSpeed = 1;

		this._precision = MIN_PRECISION_CHASE;

		let [targetDir, kickSpeed] = Volley.calcPhi(this._robot, futureBall.speed, futureBall.pos, targetPos, targetSpeed); // TODO: calcPhi with no relaitve speed is questionable
		this.targetRobotDir = targetDir;

		let dribblerOffset = Vector.fromPolar(targetDir, this._robot.shootRadius + World.Ball.radius);
		let moveDest = futureBall.pos - dribblerOffset;
		let endSpeed = futureBall.speed.withLength(futureBall.speed.length() + relativeEndSpeed);

		endSpeed = this._catchBall.limitEndSpeedToField(moveDest, endSpeed);

		this._setObstacles(moveDest);
		this._robot.trajectory.update(ToTarget, moveDest, targetDir, undefined, endSpeed);
		this._messaging.sendBroadcast(MessageType.attackPosition, futureBall.pos);
		let attackTime = Physics.robotTimeToPos(this._robot, moveDest, endSpeed)[0] + World.Time;
		this._messaging.sendBroadcast(MessageType.plannedAttackTime, attackTime);
		this._messaging.sendBroadcast(MessageType.earliestAttackTime, attackTime);

		let currentDribblerPos = this._robot.pos + dribblerOffset;
		if (World.Ball.pos.distanceTo(currentDribblerPos) < 0.35) {
			this._sendShootCommand(kickSpeed, targetPos, targetDir);
		}
	}

	private static MIN_TIME: number = 0.2;
	private static DISTRACTION_PERCENTAGE: number = 0.9;
	private _shootVolley(targetPos: Position, targetSpeed: number, futureBall: Physics.BallLike, futureBallTime: number) {
		let [targetDir, kickSpeed] = Volley.calcPhi(this._robot, futureBall.speed, futureBall.pos, targetPos, targetSpeed);
		this.targetRobotDir = targetDir;
		let dribblerOffset = Vector.fromPolar(targetDir, this._robot.shootRadius + World.Ball.radius);
		let moveDest = futureBall.pos - dribblerOffset;

		// don't follow the ball if it is inside the robot (because of the ball extrapolation)
		if (World.Time - this._lastBallInsideRobotTime < 0.1) {
			moveDest = this._robot.pos;
		}
		debug.set("ballinsiderobot", World.Time - this._lastBallInsideRobotTime);

		// don't look in the correct direction from the beginning
		let distance = World.Ball.pos.distanceTo(futureBall.pos);
		let ballTravelTime = Physics.ballTravelTime(World.Ball, distance);
		if (this._robot.pos.distanceTo(moveDest) < 0.05 && ballTravelTime > Shoot.MIN_TIME && ballTravelTime !== Infinity) {
			let [clockwiseRotation, counterClockwiseRotation] = Physics.robotRotationRangeForTime(this._robot,
					Shoot.DISTRACTION_PERCENTAGE * ballTravelTime);
			let shootVector = targetPos - moveDest;
			let shootAngle = shootVector.angle();
			let angleDiff = Math.abs(this._robot.dir - shootAngle);

			let rotateClockwise = moveDest.x > 0;
			if (rotateClockwise && counterClockwiseRotation > angleDiff) {
				shootVector.rotate(-clockwiseRotation);
			} else if (!rotateClockwise && clockwiseRotation > angleDiff) {
				shootVector.rotate(counterClockwiseRotation);
			}
			targetPos = moveDest + shootVector;
		}

		let visBallStartPos: Position;
		if (!this._catchBallNecessary(moveDest, futureBallTime)) {
			this._setObstacles(moveDest);
			// must use the same pathfinding as catchball
			this._robot.trajectory.update(CurvedMaxAccel, moveDest, targetDir);
			this._messaging.sendBroadcast(MessageType.attackPosition, futureBall.pos);
			this._messaging.sendBroadcast(MessageType.earliestAttackTime, futureBallTime + World.Time);
			this._messaging.sendBroadcast(MessageType.plannedAttackTime, futureBallTime + World.Time);
			this._catchBallActive = false;
			visBallStartPos = futureBall.pos;
		} else {
			let catchTime = this._catchBall._catchBall(targetPos, 0, targetSpeed);
			this._messaging.sendBroadcast(MessageType.earliestAttackTime, catchTime + World.Time);
			this._messaging.sendBroadcast(MessageType.plannedAttackTime, catchTime + World.Time);
			this._catchBallActive = true;
			visBallStartPos = Physics.ballAtTime(World.Ball, catchTime).pos;
		}

		let currentDribblerPos = this._robot.pos + dribblerOffset;
		if (World.Ball.pos.distanceTo(currentDribblerPos) < 0.35) {
			this._sendShootCommand(kickSpeed, targetPos, targetDir);
		}
		return visBallStartPos;
	}

	private _shootStopBall(futureBall: Physics.BallLike, futureBallTime: number) {
		let ballOrigin = futureBall.pos - futureBall.speed;
		// the future ball might be standing still, so use the current ball speed. The direction is the same
		let targetDir = (-World.Ball.speed).angle();
		this.targetRobotDir = targetDir;
		let dribblerOffset = Vector.fromPolar(targetDir, this._robot.shootRadius + World.Ball.radius);
		let moveDest = futureBall.pos - dribblerOffset;

		let visBallStartPos: Position;
		if (!this._catchBallNecessary(moveDest, futureBallTime)) {
			this._setObstacles(moveDest);
			this._robot.trajectory.update(CurvedMaxAccel, moveDest, targetDir, undefined, undefined);
			this._messaging.sendBroadcast(MessageType.attackPosition, futureBall.pos);
			this._messaging.sendBroadcast(MessageType.earliestAttackTime, Physics.robotTimeToPos(this._robot, moveDest, new Vector(0, 0))[0] + World.Time);
			this._catchBallActive = false;
			visBallStartPos = futureBall.pos;
		} else {
			let attackTime = this._catchBall._catchBall(ballOrigin, 0, undefined);
			this._messaging.sendBroadcast(MessageType.earliestAttackTime, attackTime + World.Time);
			this._catchBallActive = true;
			visBallStartPos = Physics.ballAtTime(World.Ball, attackTime).pos;
		}

		// activate dribbler to stop the ball
		if (futureBallTime < 0.3) {
			this._robot.setDribblerSpeed(0.6);
		}

		this._rightOrientation = false;
		return visBallStartPos;
	}

	private static _visualizeShoot(futureBallPos: Position, targetPos: Position, color: vis.Color) {
		vis.addCircle("t/a/shoot: State", futureBallPos, 0.07, color, true);
		vis.addCircle("t/a/shoot: State", targetPos, 0.07, color, true);
		vis.addPath("t/a/shoot: State", [futureBallPos, targetPos], color, undefined, undefined, 0.03);
	}

	_doShoot(targetPos: Position, targetSpeed: number, targetTime?: number, ballReceiptPos?: Position,
			linearShoot: boolean = false, precision: number = MIN_PRECISION) {
		this.targetRobotDir = (targetPos - this._robot.pos).angle();
		let [futureBall, futureBallTime] = this._calculateFutureBall(ballReceiptPos);
		debug.set("Shoot/futureBallTime", futureBallTime);
		let chaseFutureBall = this._calculateChaseFutureBall(targetPos);

		this._state = this._getState(targetPos, futureBall, futureBallTime, targetTime, chaseFutureBall);
		debug.set("Shoot/State", this._state);

		this._linearShoot = linearShoot;
		this._precision = precision;

		let color: vis.Color;
		let visBallStartPos: Position;
		if (this._state === ShootState.StationaryBall) {
			this._shootStationaryBall(targetPos, targetSpeed, targetTime, futureBall);
			color = vis.colors.whiteHalf;
			visBallStartPos = futureBall.pos;
		} else if (this._state === ShootState.ChaseBall) {
			this._shootChaseBall(targetPos, targetSpeed, chaseFutureBall);
			color = vis.colors.skyBlueHalf;
			visBallStartPos = futureBall.pos;
		} else if (this._state === ShootState.Volley) {
			visBallStartPos = this._shootVolley(targetPos, targetSpeed, futureBall, futureBallTime);
			color = vis.colors.greenHalf;
		} else {// "StopBall"
			visBallStartPos = this._shootStopBall(futureBall, futureBallTime);
			color = vis.colors.redHalf;
		}

		if (this._state !== ShootState.StationaryBall) {
			this._directMovement = false;
		}

		Shoot._visualizeShoot(visBallStartPos, targetPos, color);

		this._setMainAttackerParameters(futureBall.pos + Vector.fromAngle(this.targetRobotDir), this._robot.maxSpeed);
		this._messaging.sendBroadcast(MessageType.shootDestination, targetPos);

		this._lastTargetPos = targetPos;
	}

	/**
	 * Shoot the ball such that it reaches targetPos with a speed of targetSpeed
	 * This ability will overwrite the ignoreBall, ignorePass, ignoreFriendlyRobots
	 * and ignoreOpponentRobots obstacle parameters
	 * @param targetPos - Where to shoot at
	 * @param targetSpeed - The velocity of the ball when it reaches targetPos
	 * @param targetTime
	 * @param ballReceiptPos - In case of incoming passes, where to shoot from
	 * @param precision
	 */
	_shoot(targetPos: Position, targetSpeed: number, targetTime?: number, ballReceiptPos?: Position, precision?: number) {
		this._doShoot(targetPos, targetSpeed, targetTime, ballReceiptPos, true, precision);
	}

	/**
	 * Chips the ball such that it hits the ground at firstContactPos
	 * This ability will overwrite the ignoreBall, ignorePass, ignoreFriendlyRobots
	 * and ignoreOpponentRobots obstacle parameters
	 * @param firstContactPos - Where the ball hits the ground the first time
	 * @param targetTime
	 * @param ballReceiptPos - In case of incoming passes, where to shoot from
	 * @param precision
	 */
	_chipToPos(firstContactPos: Position, targetTime?: number, ballReceiptPos?: Position, precision?: number) {
		this._doShoot(firstContactPos, 8, targetTime, ballReceiptPos, false, precision);
	}

	/**
	 * Chips the ball such that it can be accepted at rollingBallPos
	 * This ability will overwrite the ignoreBall, ignorePass, ignoreFriendlyRobots
	 * and ignoreOpponentRobots obstacle parameters
	 * @param rollingBallPos - Where the ball is starting to roll
	 * @param ballReceiptPos - In case of incoming passes, where to shoot from
	 * @param targetTime
	 * @param precision
	 * @param manualChipDistFactor
	 */
	_chipPass(rollingBallPos: Position, ballReceiptPos?: Position, targetTime?: undefined,
			precision?: number, manualChipDistFactor: number = CHIP_PASS_DISTANCE_FACTOR) {
		let origin: Position;
		if (ballReceiptPos != undefined && (ballReceiptPos - World.Ball.pos).dot(World.Ball.speed) > 0
				&& World.Ball.speed.length() > 0.5) {
			origin = ballReceiptPos.orthogonalProjection(World.Ball.pos, World.Ball.pos + World.Ball.speed)[0];
		} else {
			origin = World.Ball.pos;
		}
		let firstContactPos = origin + (rollingBallPos - origin).scaleLength(manualChipDistFactor);
		this._chipToPos(firstContactPos, undefined, ballReceiptPos, precision); // as we cannot time the chip anyways, we ignore the targetTime
	}

	_shootFreeKick(targetPos: Position, targetSpeed: number, targetTime?: number, precision: number = MIN_PRECISION) {
		this._linearShoot = true;
		this._precision = precision;
		this._shootStationaryBall(targetPos, targetSpeed, targetTime, World.Ball);

		Shoot._visualizeShoot(World.Ball.pos, targetPos, vis.colors.whiteHalf);

		this._lastTargetPos = targetPos;
	}
}
