import * as geom from "base/geom";
import { Position, Vector } from "base/vector";

import { Agent, Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";

let NUM_OF_REVOLUTIONS = 3;
let ANGULAR_SPEED_FACTOR = 0.8; // the higher it is, the longer it takes

export class Victory extends Task {

	private _center : Position;
	private _centerAngle: number;
	private _radius: number;

	private _state: string;
	private _outerAngle: number;
	private _ticks: number;
	private _increment: boolean;

	private _obstacleTable: PathHelper.PathHelperParameters;

	constructor(agent: Agent, center: Position, startingAngle: number, angle: number, radius: number) {
		if (center == undefined || angle == undefined) {
			throw new Error("Missing Parameters for Victory-Task");
		}
		super(agent);
		this._center = center;
		this._centerAngle = startingAngle;
		this._radius = radius;

		this._state = "double circle";
		this._outerAngle = angle;
		this._ticks = 1;
		this._increment = true;

		let ignore = true;
		this._obstacleTable = {
			ignoreBall: ignore,
			ignorePass: ignore,
			ignoreGoals: ignore,
			ignoreDefenseArea: ignore
		};
	}

	public run() {
		this._centerAngle = this._centerAngle + Math.PI / (480 * ANGULAR_SPEED_FACTOR);
		this._outerAngle = this._outerAngle + Math.PI / (180 + this._ticks * 180) * ANGULAR_SPEED_FACTOR;
		let pos: Position | undefined;
		if (this._state === "double circle") {
			let origin = Vector.fromAngle(this._centerAngle).withLength(this._radius / 2);
			pos = this._center + origin + Vector.fromAngle(this._outerAngle).withLength(this._radius / (4 - this._ticks * 2));
			this._state = Math.abs(this._centerAngle) < NUM_OF_REVOLUTIONS * 2 * Math.PI ? "double circle" : "spiral prepare";
			if (this._state === "spiral prepare") {
				this._ticks = 1;
				this._increment = false;
			}
		} else if (this._state === "spiral prepare") {
			let origin = Vector.fromAngle(this._centerAngle).withLength((this._radius / 2) * this._ticks);
			pos = this._center + origin + Vector.fromAngle(this._outerAngle).withLength(this._radius / (4 - this._ticks * 2));
			this._state = this._ticks > 0 ? "spiral prepare" : "spiral";
		} else if (this._state === "spiral") {
			pos = this._center + Vector.fromAngle(this._outerAngle).withLength(this._radius - this._ticks * this._radius * 3 / 4);
			this._state = this._centerAngle > 2 * NUM_OF_REVOLUTIONS * 2 * Math.PI ? "double circle prepare" : "spiral";
			if (this._state === "double circle prepare") {
				this._centerAngle = geom.normalizeAnglePositive(this._centerAngle);
				this._ticks = 0;
				this._increment = true;
			}
		} else if (this._state === "double circle prepare") {
			let origin = Vector.fromAngle(this._centerAngle).withLength((this._radius / 2) * this._ticks);
			pos = this._center + origin + Vector.fromAngle(this._outerAngle).withLength(this._radius / (4 - this._ticks * 2));
			this._state = this._ticks > 1 ? "double circle" : "double circle prepare";
		}

		if (this._increment) {
			this._ticks = this._ticks + 0.002;
			this._increment = this._ticks < 1;
		} else {
			this._ticks = this._ticks - 0.002;
			this._increment = this._ticks < 0;
		}
		this._robot.path.clearObstacles();
		let endSpeed = new Vector(0, 0);
		let dir = (<Position> pos - this._robot.pos).angle();
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable);
		this._robot.trajectory.update(ToTarget, pos!, dir, 1, endSpeed);
	}

}
