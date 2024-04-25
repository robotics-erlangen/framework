import * as debug from "base/debug";
import * as geom from "base/geom";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { Task } from "glados/task/base";
import { PerfectDribblerRotateAndShoot } from "glados/test/helper/perfectdribblerrotateandshoot";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";
import * as Rating from "glados/util/rating";

const obstacleTable: PathHelper.PathHelperParameters = {
	ignoreBall: true,
	ignorePass: true,
	ignoreDefenseArea: false,
	ignoreOpponentDefenseArea: false,
};

export class TIGERsTestGoalShot extends Task {

	private _rotateAndShoot: PerfectDribblerRotateAndShoot;
	private _lastWasWayTooFar: boolean;
	private _lastBallInDribbler: boolean;
	private _framesInDribbler: number = 0;

	public constructor(behavior: Behavior) {
		super(behavior);
		this._rotateAndShoot = new PerfectDribblerRotateAndShoot(this);
		this._lastWasWayTooFar = true;
		this._lastBallInDribbler = false;
	}

	private _setObstacles() {
		let ignoreRobots = this._robot.speed.length() < 1;
		PathHelper.setObstacleParam(this._robot, PathHelper.ParameterType.ignoreBall, true);
		PathHelper.setObstacleParam(this._robot, PathHelper.ParameterType.ignorePass, true);
		PathHelper.setObstacleParam(this._robot, PathHelper.ParameterType.ignoreFriendlyRobots, ignoreRobots);
		PathHelper.setObstacleParam(this._robot, PathHelper.ParameterType.ignoreOpponentRobots, ignoreRobots);

		let distToBall = this._robot.pos.distanceTo(World.Ball.pos);
		let obstacleSize = Rating.valueToRating(distToBall, 0.2, 0.4) * (World.Ball.radius + 0.01);
		if (obstacleSize > 0) {
			this._robot.path.addCircle(World.Ball.pos, obstacleSize, "t/a/shoot ball", PathHelper.PRIORITIES.BALL);
		}
	}

	public run(): void {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);
		this._setObstacles();

		let target = World.Geometry.OpponentGoalLeft;

		let wayTooFar: boolean;
		if (World.Ball.detectionQuality > 0.3) {
			wayTooFar = World.Ball.pos.distanceTo(this._robot.pos) > (this._lastWasWayTooFar ? 1.5 : 3) * this._robot.shootRadius;
		} else {
			wayTooFar = this._lastWasWayTooFar;
		}

		let ballInDribbler: boolean;
		this._lastWasWayTooFar = wayTooFar;
		let requiredAngleDiff = this._lastBallInDribbler ? geom.degreeToRadian(40) : geom.degreeToRadian(5);
		if ((World.Ball.pos - this._robot.pos).angleDiff(Vector.fromAngle(this._robot.dir)) < requiredAngleDiff && !wayTooFar) {
			if (World.Ball.isPositionValid() && World.Ball.detectionQuality > 0.3) {
				const requiredDist = this._robot.shootRadius + 0.05;
				ballInDribbler = this._robot.pos.distanceToSq(World.Ball.pos) < requiredDist * requiredDist;
			} else {
				ballInDribbler = true;
			}
		} else {
			ballInDribbler = false;
		}

		if (ballInDribbler) {
			this._framesInDribbler += 1;
		} else {
			this._framesInDribbler = 0;
		}

		debug.set("ballInDribbler", ballInDribbler);
		debug.set("wayTooFar", this._lastWasWayTooFar);

		if (this._framesInDribbler >= 5) {
			this._rotateAndShoot._rotateAndShoot((target - this._robot.pos).angle());
		} else {
			this._robot.trajectory.update(ToTarget,
				World.Ball.pos + (this._robot.pos - World.Ball.pos).withLength(this._robot.shootRadius),
				(World.Ball.pos - this._robot.pos).angle());
			this._robot.setDribblerSpeed(1);
		}

		this._lastBallInDribbler = ballInDribbler;
	}
}
