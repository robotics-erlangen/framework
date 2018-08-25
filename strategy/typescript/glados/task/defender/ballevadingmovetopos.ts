import * as Constants from "base/constants";
import * as geom from "base/geom";
import {Position} from "base/vector";
import * as World from "base/world";
import * as PathHelper from "glados/trajectory/pathhelper";
import {ToTarget} from "glados/trajectory/totarget";
import {Task, Agent} from "glados/task/base";

export class BallEvadingMoveToPos extends Task {
	private _pos: Position;
	private _dir: number | undefined;
	private _obstacleTable: PathHelper.PathHelperParameters;

	constructor(agent: Agent, pos: Position, dir: number | undefined) {
		super(agent);
		this._pos = pos;
		this._dir = dir;
		this._obstacleTable = {
			ignoreBall: false,
			messaging: this._messaging
		}
	}

	run () {
		let minDist = Constants.stopBallDistance + World.Ball.radius + this._robot.radius;

		let pos = this._pos
		if (pos.distanceTo(World.Ball.pos) < minDist - 0.01) {
			pos = geom.intersectLineCircle(World.Geometry.FriendlyGoal,
				World.Geometry.FriendlyGoal - this._pos, World.Ball.pos, minDist)[0];
		}

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable);

		let dir = this._dir != undefined ? this._dir : (World.Ball.pos - pos).angle();
		this._robot.trajectory.update(ToTarget, pos, dir)
	}
}