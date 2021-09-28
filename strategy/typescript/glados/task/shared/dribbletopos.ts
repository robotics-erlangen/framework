import { Position } from "base/vector";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import * as BallObserver from "glados/observer/ball";
import { Task } from "glados/task/base";
import { Obstacle } from "glados/task/shared/movetopos";
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

export class DribbleToPos extends Task {
	private pos: Position;
	private dir: number;
	private endSpeedLength: number;
	private obstacleTable: PathHelper.PathHelperParameters;
	private customObstacles: Obstacle[];
	private useCMA: boolean;

	private currentlyDribbling: boolean = false;

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

	public run() {
		let targetPos = this.pos;

		let distanceToBall = 0;
		let angleLookToBall = this.dir;
		let angleBallToTargetPos = 1;

		if (World.Ball.isPositionValid()) {
			let ballDirection = BallObserver.getRealisticBallPos() - this._robot.pos;
			const targetDirection = (targetPos - this._robot.pos).normalized();

			distanceToBall = ballDirection.length() - this._robot.radius - World.Ball.radius;

			ballDirection = ballDirection.normalized();

			angleBallToTargetPos = targetDirection.dot(ballDirection);
			angleLookToBall = ballDirection.angle();
		}

		const angleThreshold = this.currentlyDribbling ? 0.5 : 0.95;
		if (distanceToBall < 0.01 && angleBallToTargetPos > angleThreshold) {
			this.currentlyDribbling = true;
		} else {
			this.currentlyDribbling = false;
		}

		if (!this.currentlyDribbling) {
			this.dir = angleLookToBall;
			this.obstacleTable.ignoreBall = angleBallToTargetPos > 0.8;

			const directionGateToBall = (BallObserver.getRealisticBallPos() - this.pos).normalized();
			targetPos = BallObserver.getRealisticBallPos() + this._robot.radius * directionGateToBall;

			const dribbleStartDistance = 0.1;
			const dribblerSpeed = 1.0 - Math.max(dribbleStartDistance, distanceToBall) / dribbleStartDistance;
			this._robot.setDribblerSpeed(dribblerSpeed);
		} else {
			this.dir = this._robot.speed.angle();
		}

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this.obstacleTable);

		for (let obstacle of this.customObstacles) {
			this._addCustomObstacle(obstacle);
		}

		let maxSpeed = 0.3;
		let endSpeed = (this.pos - this._robot.pos).withLength(this.endSpeedLength);
		if (this.useCMA) {
			this._robot.trajectory.update(CurvedMaxAccel, targetPos, this.dir, maxSpeed, endSpeed);
		} else {
			this._robot.trajectory.update(ToTarget, targetPos, this.dir, maxSpeed, endSpeed);
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
