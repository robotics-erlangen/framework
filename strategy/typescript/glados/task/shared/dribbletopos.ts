/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
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
**************************************************************************/

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
	private _pos: Position;
	private _dir: number;
	private _endSpeedLength: number;
	private _obstacleTable: PathHelper.PathHelperParameters;
	private _customObstacles: Obstacle[]; // a list of obstacles to be added to the path, see base/path
	private _useCMA: boolean;

	private static _currentlyDribbling: boolean = false;
	private _obstacleToAvoid: CircleObstacle | undefined = undefined;
	private _alternativeTargetPos: Position = new Vector(0, 0);
	private _alternativeDirection: Vector = new Vector(0, 0);
	private _movingToPush: boolean = false;

	public constructor(behavior: Behavior, params: Parameters) {
		super(behavior);

		this._pos = params.pos;

		if (params.dir === undefined) {
			params.dir = (World.Ball.pos - params.pos).angle();
		}
		this._dir = params.dir;
		if (params.endSpeedLength === undefined) {
			params.endSpeedLength = 0;
		}
		this._endSpeedLength = params.endSpeedLength;
		if (params.customObstacles === undefined) {
			params.customObstacles = [];
		}
		this._customObstacles = params.customObstacles;

		const ignore = params.ignoreDefaultObstacles === true;
		this._obstacleTable = {
			ignoreBall: ignore || params.ignoreBall === true,
			ignoreDefenseArea: ignore,
			ignoreOpponentDefenseArea: ignore,
			task: this,
			ignorePass: this._messaging == undefined || ignore,
			ignoreBallPlacementObstacle: params.ignoreBallPlacement === true
		};

		this._useCMA = params.useCMA === true;
	}

	private _getBallPosition(): Position {
		if (isBallValid()) {
			return BallObserver.getRealisticBallPos();
		} else {
			return this._robot.pos + Vector.fromAngle(this._robot.dir) * (this._robot.radius - World.Ball.radius);
		}
	}

	public run() {
		let targetPos = this._pos;
		const directionGateToBall = (BallObserver.getRealisticBallPos() - this._pos).normalized();
		const directionRobotToBall = (this._getBallPosition() - this._robot.pos).normalized();

		let distanceToBall = 0;
		let angleCurrentPosToBall = this._robot.dir;
		let angleBallToTargetPos = 1;

		if (isBallValid()) {
			let ballDirection = this._getBallPosition() - this._robot.pos;
			const targetDirection = (targetPos - this._robot.pos).normalized();

			distanceToBall = ballDirection.length() - this._robot.radius + World.Ball.radius;

			ballDirection = ballDirection.normalized();

			angleBallToTargetPos = targetDirection.dot(ballDirection);
			angleCurrentPosToBall = ballDirection.angle();
		}

		let minDistance: number = this._robot.radius * 1.8;
		let preliminaryTargetPos: Position;
		let noObstaclesInArea = true;
		if (!DribbleToPos._currentlyDribbling && this._obstacleToAvoid == undefined) {
			preliminaryTargetPos = this._getBallPosition() + (this._robot.radius - World.Ball.radius) * -directionRobotToBall;

			for (let obstacle of this._customObstacles) {
				if (obstacle.type !== "circle" || !obstacle.name?.startsWith("dribble")) {
					continue;
				}

				let distanceToObstacle = (preliminaryTargetPos - obstacle.center).length();
				if (distanceToObstacle < this._robot.radius * 3.0) {
					noObstaclesInArea = false;
				}
				if (minDistance > distanceToObstacle) {
					minDistance = distanceToObstacle;
					this._obstacleToAvoid = obstacle;
				}
			}
		}

		if (this._obstacleToAvoid != undefined) {
			this._obstacleToAvoid.radius *= 0.5;
			this._alternativeDirection = (this._getBallPosition() - this._obstacleToAvoid.center).normalized();
			let angleDiffObstacle = this._alternativeDirection.angle() - (angleCurrentPosToBall + Math.PI);
			while (angleDiffObstacle > 2 * Math.PI) {
				angleDiffObstacle -= 2 * Math.PI;
			}
			while (angleDiffObstacle < 0) {
				angleDiffObstacle += 2 * Math.PI;
			}

			const extraDistance = angleDiffObstacle > 0.25 * Math.PI && angleDiffObstacle < 1.75 * Math.PI
				? this._robot.radius
				: 0;
			this._alternativeTargetPos = this._getBallPosition() + (extraDistance + this._robot.radius - World.Ball.radius) * this._alternativeDirection;
		}

		let angleDiff = angleCurrentPosToBall - this._robot.dir;
		while (angleDiff > 2 * Math.PI) {
			angleDiff -= 2 * Math.PI;
		}
		while (angleDiff < 0) {
			angleDiff += 2 * Math.PI;
		}

		const conservativeAngleThreshold = Math.PI * 0.1;
		const angleThreshold: number = DribbleToPos._currentlyDribbling ? Math.PI * 0.30 : conservativeAngleThreshold;
		let angleOkay: boolean = (angleDiff < angleThreshold || angleDiff > 2 * Math.PI - angleThreshold);

		let ignoreBall: boolean = true;

		if (this._movingToPush && angleOkay) {
			this._movingToPush = false;
		} else if (noObstaclesInArea && (directionGateToBall.dot(directionRobotToBall) > -0.4)) {
			this._movingToPush = true;
		}

		const maxDribbleSpeed = 0.4;
		const distanceThreshold: number = DribbleToPos._currentlyDribbling ? 0.06 : 0.03;
		if (distanceToBall < distanceThreshold && angleOkay && (DribbleToPos._currentlyDribbling || !this._movingToPush)) {
			DribbleToPos._currentlyDribbling = true;
			this._robot.setDribblerSpeed(maxDribbleSpeed);
			this._dir = (this._pos - this._robot.pos).normalized().angle();

			if (this._obstacleToAvoid != undefined) {
				this._obstacleToAvoid.radius = this._robot.radius;
				this._obstacleToAvoid = undefined;
			}
		} else {
			DribbleToPos._currentlyDribbling = false;

			let offset: number = 0;
			if (this._movingToPush || (!noObstaclesInArea && !angleOkay)) {
				offset = this._robot.radius * 2;
				ignoreBall = false;
			}

			targetPos = noObstaclesInArea
				? this._getBallPosition() + (offset + this._robot.radius - World.Ball.radius) * directionGateToBall
				: this._alternativeTargetPos + offset * this._alternativeDirection;

			if (isBallValid()) {
				this._dir = (this._getBallPosition() - targetPos).normalized().angle();
			}

			const dribblerSpeed = (distanceToBall < 0.05) ? 1.0 : 1 - Math.max(0.1, distanceToBall) / 0.1;
			this._robot.setDribblerSpeed(dribblerSpeed * maxDribbleSpeed);

			this._obstacleTable.ignoreBall = ignoreBall;
		}

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable);

		for (let obstacle of this._customObstacles) {
			this._robot.path.addObstacle(obstacle);
		}

		let minMaxSpeed = (DribbleToPos._currentlyDribbling &&
					(angleDiff < conservativeAngleThreshold * 0.5 || angleDiff > 2 * Math.PI - conservativeAngleThreshold * 0.5))
			? 0.5
			: 0.3;
		let alphaSpeed = Math.min((Math.max(distanceToBall, 0.1) - 0.1), 1.0);
		let maxSpeed = this._robot.maxSpeed * alphaSpeed + minMaxSpeed * (1 - alphaSpeed);
		if (angleBallToTargetPos < 0.2 && DribbleToPos._currentlyDribbling) {
			maxSpeed = 0.1;
		}
		let endSpeed = (this._pos - this._robot.pos).withLength(this._endSpeedLength);

		if (this._useCMA) {
			this._robot.trajectory.update(CurvedMaxAccel, targetPos, this._dir, maxSpeed, endSpeed, 0.5, DribbleToPos._currentlyDribbling);
		} else {
			this._robot.trajectory.update(ToTarget, targetPos, this._dir, maxSpeed, endSpeed);
		}
	}
}
