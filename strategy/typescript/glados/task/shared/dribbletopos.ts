import { Obstacle, CircleObstacle } from "base/path";
import { RobotLike } from "base/trajectory";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import * as BallObserver from "glados/observer/ball";
import { Task } from "glados/task/base";
import { CurvedMaxAccel } from "glados/trajectory/curvedmaxaccel";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";

export type Parameters = {
	pos: Position;
	dir?: number;
	endSpeedLength?: number;
	customObstacles?: Obstacle[];
	ignoreDefaultObstacles?: boolean;
	ignoreBallPlacement?: boolean;
	ignoreBall?: boolean;
	useCMA?: boolean;
};

function isBallValid(): boolean {
	return World.Ball.isPositionValid() && World.Ball.detectionQuality > 0.1;
}

export class DribbleToPos extends Task {
	private pos: Position;
	private dir: number;
	private endSpeedLength: number;
	private obstacleTable: PathHelper.PathHelperParameters;
	private customObstacles: Obstacle[]; // a list of obstacles to be added to the path, see base/path
	private useCMA: boolean;

	private static currentlyDribbling: boolean = false;
	private obstacleToAvoid: CircleObstacle | undefined = undefined;
	private alternativeTargetPos: Position = new Vector(0, 0);
	private alternativeDirection: Vector = new Vector(0, 0);
	private movingToPush: boolean = false;

	public constructor(behavior: Behavior, params: Parameters) {
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
		const directionGateToBall = (BallObserver.getRealisticBallPos() - this.pos).normalized();
		const directionRobotToBall = (this.getBallPosition() - this._robot.pos).normalized();

		let distanceToBall = 0;
		let angleCurrentPosToBall = this._robot.dir;
		let angleBallToTargetPos = 1;

		if (isBallValid()) {
			let ballDirection = this.getBallPosition() - this._robot.pos;
			const targetDirection = (targetPos - this._robot.pos).normalized();

			distanceToBall = ballDirection.length() - this._robot.radius + World.Ball.radius;

			ballDirection = ballDirection.normalized();

			angleBallToTargetPos = targetDirection.dot(ballDirection);
			angleCurrentPosToBall = ballDirection.angle();
		}

		let minDistance: number = this._robot.radius * 1.8;
		let preliminaryTargetPos: Position;
		let noObstaclesInArea = true;
		if (!DribbleToPos.currentlyDribbling && this.obstacleToAvoid == undefined) {
			preliminaryTargetPos = this.getBallPosition() + (this._robot.radius - World.Ball.radius) * -directionRobotToBall;

			for (let obstacle of this.customObstacles) {
				if (obstacle.type !== "circle" || !obstacle.name?.startsWith("dribble")) {
					continue;
				}

				let distanceToObstacle = (preliminaryTargetPos - obstacle.center).length();
				if (distanceToObstacle < this._robot.radius * 3.0) {
					noObstaclesInArea = false;
				}
				if (minDistance > distanceToObstacle) {
					minDistance = distanceToObstacle;
					this.obstacleToAvoid = obstacle;
				}
			}
		}

		if (this.obstacleToAvoid != undefined) {
			this.obstacleToAvoid.radius *= 0.5;
			this.alternativeDirection = (this.getBallPosition() - this.obstacleToAvoid.center).normalized();
			let angleDiffObstacle = this.alternativeDirection.angle() - (angleCurrentPosToBall + Math.PI);
			while (angleDiffObstacle > 2 * Math.PI) {
				angleDiffObstacle -= 2 * Math.PI;
			}
			while (angleDiffObstacle < 0) {
				angleDiffObstacle += 2 * Math.PI;
			}

			const extraDistance = angleDiffObstacle > 0.25 * Math.PI && angleDiffObstacle < 1.75 * Math.PI
				? this._robot.radius
				: 0;
			this.alternativeTargetPos = this.getBallPosition() + (extraDistance + this._robot.radius - World.Ball.radius) * this.alternativeDirection;
		}

		let angleDiff = angleCurrentPosToBall - this._robot.dir;
		while (angleDiff > 2 * Math.PI) {
			angleDiff -= 2 * Math.PI;
		}
		while (angleDiff < 0) {
			angleDiff += 2 * Math.PI;
		}

		const conservativeAngleThreshold = Math.PI * 0.1;
		const angleThreshold: number = DribbleToPos.currentlyDribbling ? Math.PI * 0.30 : conservativeAngleThreshold;
		let angleOkay: boolean = (angleDiff < angleThreshold || angleDiff > 2 * Math.PI - angleThreshold);

		let ignoreBall: boolean = true;

		if (this.movingToPush && angleOkay) {
			this.movingToPush = false;
		} else if (noObstaclesInArea && (directionGateToBall.dot(directionRobotToBall) > -0.4)) {
			this.movingToPush = true;
		}

		const maxDribbleSpeed = 0.4;
		const distanceThreshold: number = DribbleToPos.currentlyDribbling ? 0.06 : 0.03;
		if (distanceToBall < distanceThreshold && angleOkay && (DribbleToPos.currentlyDribbling || !this.movingToPush)) {
			DribbleToPos.currentlyDribbling = true;
			this._robot.setDribblerSpeed(maxDribbleSpeed);
			this.dir = (this.pos - this._robot.pos).normalized().angle();

			if (this.obstacleToAvoid != undefined) {
				this.obstacleToAvoid.radius = this._robot.radius;
				this.obstacleToAvoid = undefined;
			}
		} else {
			DribbleToPos.currentlyDribbling = false;

			let offset: number = 0;
			if (this.movingToPush || (!noObstaclesInArea && !angleOkay)) {
				offset = this._robot.radius * 2;
				ignoreBall = false;
			}

			targetPos = noObstaclesInArea
				? this.getBallPosition() + (offset + this._robot.radius - World.Ball.radius) * directionGateToBall
				: this.alternativeTargetPos + offset * this.alternativeDirection;

			if (isBallValid()) {
				this.dir = (this.getBallPosition() - targetPos).normalized().angle();
			}

			const dribblerSpeed = (distanceToBall < 0.05) ? 1.0 : 1 - Math.max(0.1, distanceToBall) / 0.1;
			this._robot.setDribblerSpeed(dribblerSpeed * maxDribbleSpeed);

			this.obstacleTable.ignoreBall = ignoreBall;
		}

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this.obstacleTable);

		for (let obstacle of this.customObstacles) {
			this._robot.path.addObstacle(obstacle);
		}

		let minMaxSpeed = (DribbleToPos.currentlyDribbling &&
					(angleDiff < conservativeAngleThreshold * 0.5 || angleDiff > 2 * Math.PI - conservativeAngleThreshold * 0.5))
			? 0.5
			: 0.3;
		let alphaSpeed = Math.min((Math.max(distanceToBall, 0.1) - 0.1), 1.0);
		let maxSpeed = this._robot.maxSpeed * alphaSpeed + minMaxSpeed * (1 - alphaSpeed);
		if (angleBallToTargetPos < 0.2 && DribbleToPos.currentlyDribbling) {
			maxSpeed = 0.1;
		}
		let endSpeed = (this.pos - this._robot.pos).withLength(this.endSpeedLength);

		if (this.useCMA) {
			this._robot.trajectory.update(CurvedMaxAccel, targetPos, this.dir, maxSpeed, endSpeed, 0.5, DribbleToPos.currentlyDribbling);
		} else {
			this._robot.trajectory.update(ToTarget, targetPos, this.dir, maxSpeed, endSpeed);
		}
	}
}
