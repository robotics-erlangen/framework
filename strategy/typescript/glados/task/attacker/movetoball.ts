import { Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { Agent, Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";


export class MoveToBall extends Task {
	private _addspeed: number;
	private _angleWeight: number = 1;
	private _obstacleTable: PathHelper.PathHelperParameters;

	constructor(agent: Agent, ballAddSpeed: number = 0) {
		super(agent);
		this._addspeed = ballAddSpeed;
		this._obstacleTable = {
			ignoreBall: true,
			ignorePass: true,
			ignoreDefenseArea: true,
			ignoreOpponentDefenseArea: false,
		};
	}

	run() {
		let ball = World.Ball;
		let offset = (this._robot.pos - ball.pos).setLength(this._robot.shootRadius + World.Ball.radius);
		offset.y = 0;
		let pos = ball.pos - offset;
		// this._robot.pos * 0.5 + ball.pos/2 - new Vector(0, this._robot.radius/3) + ball.speed/10
		vis.addCircle("toball", pos, ball.pos.distanceTo(pos), vis.colors.redHalf, true);
		let dir = ball.pos - pos;
		let dir2 = World.Geometry.OpponentGoal - pos;
		dir = dir / dir2.lengthSq() + dir2 / dir.lengthSq();
		let dirAngle = dir.angle();

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable);
		this._robot.trajectory.update(ToTarget, pos, dirAngle, undefined, ball.speed * 0.98 + new Vector(dir2.setLength(0.1).x, this._addspeed));

	}
}
