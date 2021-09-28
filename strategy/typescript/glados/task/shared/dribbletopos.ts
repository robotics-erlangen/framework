import { RobotLike } from "base/trajectory";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import * as BallObserver from "glados/observer/ball";
import { Task } from "glados/task/base";
import { CircleObstacle, Obstacle } from "glados/task/shared/movetopos";
import { CurvedMaxAccel } from "glados/trajectory/curvedmaxaccel";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";

export type Parameters = {
	pos: Position,
	dir?: number,
	endSpeedLength?: number,
	customObstacles?: Obstacle[],
	ignoreDefaultObstacles?: boolean,
	ignoreBallPlacement?: boolean
	ignoreBall?: boolean,
	useCMA?: boolean
};

function isBallValid(): boolean {
	return World.Ball.isPositionValid() && World.Ball.detectionQuality > 0.3;
}

export class DribbleToPos extends Task {
	private pos: Position;
	private dir: number;
	private endSpeedLength: number;
	private obstacleTable: PathHelper.PathHelperParameters;
	private customObstacles: Obstacle[];
	private useCMA: boolean;

	private currentlyDribbling: boolean = false;
	private currentAngle: number = 0;
	private obstacleToAvoid: CircleObstacle | undefined = undefined;
	private alternativeTargetPos: Position = new Vector(0,0);

	// customObstacles is a table of obstacle tables
	// An obstacle table contains a string field called type and parameters relevant for Path:addX
	// Type can be "circle", "line", "rect" and "triangle"
	constructor(behavior: Behavior, params: Parameters) {
		super(behavior);

		this.pos = params.pos;

		if (params.dir === undefined) {
			params.dir = (World.Ball.pos - params.pos).angle();
		}
		this.dir = params.dir;
		if (params.endSpeedLength === undefined) {
			params.endSpeedLength = 0;
		}
		this.endSpeedLength = params.endSpeedLength;
		if (params.customObstacles === undefined) {
			params.customObstacles = [];
		}
		this.customObstacles = params.customObstacles;

		const ignore = params.ignoreDefaultObstacles === true;
		this.obstacleTable = {
			ignoreBall: ignore || params.ignoreBall === true,
			ignoreDefenseArea: ignore,
			ignoreOpponentDefenseArea: ignore,
			task: this,
			ignorePass: this._messaging == undefined || ignore,
			ignoreBallPlacementObstacle: params.ignoreBallPlacement === true
		};

		this.useCMA = params.useCMA === true;

		// let offset = this._robot.shootRadius + World.Ball.radius + 0.1;
	}

	private getBallPosition(): Position {
		if (isBallValid()) {
			return BallObserver.getRealisticBallPos();
		} else {
			return this._robot.pos + Vector.fromAngle(this._robot.dir) * (this._robot.radius - World.Ball.radius);
		}
	}

	public run() {
		let targetPos = this.pos;

		let distanceToBall = 0;
		let angleLookToBall = this._robot.dir;
		let angleBallToTargetPos = 1;

		if (isBallValid()) {
			let ballDirection = this.getBallPosition() - this._robot.pos;
			const targetDirection = (targetPos - this._robot.pos).normalized();

			distanceToBall = ballDirection.length() - this._robot.radius + World.Ball.radius;

			ballDirection = ballDirection.normalized();

			angleBallToTargetPos = targetDirection.dot(ballDirection);
			angleLookToBall = ballDirection.angle();
		}

		let angleDiff = angleLookToBall - this._robot.dir;
		while (angleDiff > 2 * Math.PI) {
			angleDiff -= 2 * Math.PI;
		}
		while (angleDiff < 0) {
			angleDiff += 2 * Math.PI;
		}

		let minDistance: number = this._robot.radius * 2.1;
		let preliminaryTargetPos: Position;
		if (!this.currentlyDribbling && this.obstacleToAvoid == undefined) {
			this.dir = angleLookToBall;
			preliminaryTargetPos = this.getBallPosition() + (this._robot.radius - World.Ball.radius) *  (-(this.getBallPosition() - this._robot.pos).normalized());

			for (let obstacle of this.customObstacles) {
				if (obstacle.type !== "circle" || !obstacle.name.startsWith("dribble")) {
					continue;
				}

				let obstaclePos = new Vector(obstacle.x, obstacle.y);
				let distanceToObstacle = (preliminaryTargetPos - obstaclePos).length();
				if (minDistance > distanceToObstacle) {
					minDistance = distanceToObstacle;
					this.obstacleToAvoid = obstacle;
				}
			}
		}

		if (this.obstacleToAvoid != undefined) {
			this.obstacleToAvoid.radius *= 0.5;
			const obstaclePos = new Vector(this.obstacleToAvoid.x, this.obstacleToAvoid.y);
			const obstacleToBallDir = (this.getBallPosition() - obstaclePos).normalized();
			let angleDiffObstacle = obstacleToBallDir.angle() - (angleLookToBall + Math.PI);
			while (angleDiffObstacle > 2 * Math.PI) {
				angleDiffObstacle -= 2 * Math.PI;
			}
			while (angleDiffObstacle < 0) {
				angleDiffObstacle += 2 * Math.PI;
			}

			const extraDistance = angleDiffObstacle > 0.25 * Math.PI && angleDiffObstacle < 1.75 * Math.PI
				? this._robot.radius
				: 0;
			this.alternativeTargetPos = this.getBallPosition() + (extraDistance + this._robot.radius - World.Ball.radius) * obstacleToBallDir;
		}

		if (!this.currentlyDribbling && this.obstacleToAvoid != undefined) {
			this.dir = (this.getBallPosition() - this.alternativeTargetPos).normalized().angle();
		}

		let angleOkay: boolean;
		let ignoreBall: boolean;
		const noObstaclesInArea = this.obstacleToAvoid == undefined;
		if (!noObstaclesInArea) {
			const angleThreshold: number = this.currentlyDribbling ? Math.PI * 0.25 : Math.PI * 0.1;
			angleOkay = (angleDiff < angleThreshold || angleDiff > 2 * Math.PI - angleThreshold);
			ignoreBall = (angleDiff < 2 * angleThreshold || angleDiff > 2 * Math.PI - 2 * angleThreshold);
		} else {
			const angleThreshold = this.currentlyDribbling ? 0.0 : 0.7;
			angleOkay = angleBallToTargetPos > angleThreshold;
			ignoreBall = angleBallToTargetPos > angleThreshold;
		}

		const distanceThreshold: number = this.currentlyDribbling ? 0.05 : 0.025;
		if (distanceToBall < distanceThreshold && angleOkay) {
			this.currentlyDribbling = true;
			this._robot.setDribblerSpeed(2.0);
			this.dir = this._robot.speed.angle();

			if (this.obstacleToAvoid != undefined) {
				this.obstacleToAvoid.radius = this._robot.radius;
				this.obstacleToAvoid = undefined;
			}
		} else {
			this.currentlyDribbling = false;

			let directionGateToBall = (BallObserver.getRealisticBallPos() - this.pos).normalized();

			targetPos = noObstaclesInArea
				? this.getBallPosition() + (this._robot.radius - World.Ball.radius) * directionGateToBall
				: this.alternativeTargetPos;

			this.dir += this.currentAngle;

			const dribblerSpeed = 1 - Math.max(0.1, distanceToBall) / 0.1;
			this._robot.setDribblerSpeed(2 * dribblerSpeed);

			this.obstacleTable.ignoreBall = ignoreBall;
		}

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this.obstacleTable);

		for (let obstacle of this.customObstacles) {
			this._addCustomObstacle(obstacle);
		}

		let maxSpeed = (distanceToBall < 0.1) ? 0.3 : undefined;
		if (angleBallToTargetPos < 0.2 && this.currentlyDribbling) {
			maxSpeed = 0.1;
		}
		// let endSpeed = (this.pos - this._robot.pos).withLength(this.endSpeedLength);
		if (this.useCMA) {
			this._robot.trajectory.update(CurvedMaxAccel, targetPos, this.dir, maxSpeed, undefined, 0.5, this.currentlyDribbling);
		} else {
			this._robot.trajectory.update(ToTarget, targetPos, this.dir, maxSpeed, undefined);
		}
	}

	private _addCustomObstacle(obstInfo: Obstacle) {
		let path = this._robot.path;
		// If this gets changed, the comment before _init also needs to be updated
		if (obstInfo.type === "circle") {
			path.addCircle(obstInfo.x, obstInfo.y, obstInfo.radius, obstInfo.name);
		} else if (obstInfo.type === "line") {
			path.addLine(obstInfo.start_x, obstInfo.start_y, obstInfo.end_x, obstInfo.end_y, obstInfo.radius, obstInfo.name);
		} else if (obstInfo.type === "rect") {
			path.addRect(obstInfo.start_x, obstInfo.start_y, obstInfo.end_x, obstInfo.end_y, obstInfo.radius, obstInfo.name);
		} else if (obstInfo.type === "triangle") {
			path.addTriangle(obstInfo.x1, obstInfo.y1, obstInfo.x2, obstInfo.y2, obstInfo.x3, obstInfo.y3, obstInfo.lineWidth, obstInfo.name);
		}
	}
}
