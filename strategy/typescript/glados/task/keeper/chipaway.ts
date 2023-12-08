import * as vis from "base/vis";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { Shoot } from "glados/task/ability/shoot";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";

let obstacleTable: PathHelper.PathHelperParameters = {
	ignorePass: true
};

export class ChipAway extends Task {
	private _shoot: Shoot;

	public constructor(behavior: Behavior) {
		super(behavior);
		this._shoot = new Shoot(this);
	}

	public run() {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);
		// chip to opponent's defense line, so that the ball would roll into the goal's center
		let oppGoal = World.Geometry.OpponentGoal;
		let chipPos = oppGoal + (this._robot.pos - oppGoal).withLength(World.Geometry.DefenseHeight);
		this._shoot._chipToPos(chipPos);
		vis.addCircle("t/chipaway: target", chipPos, 0.05, vis.colors.orangeHalf, true);
	}
}
