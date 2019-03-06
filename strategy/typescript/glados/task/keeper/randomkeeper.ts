import * as Field from "base/field";
import * as MathUtil from "base/mathutil";
import { Vector } from "base/vector";
import * as World from "base/world";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";

const DEST_SWITCH_DISTANCE = 0.02;
const GOAL_DISTANCE = 0.06;

export class RandomKeeper extends Task {
	_nextX: number | undefined;

	run() {
		if (this._nextX == undefined || Math.abs(this._robot.pos.x - this._nextX) < DEST_SWITCH_DISTANCE) {
			let bound = World.Geometry.GoalWidth / 2 - this._robot.radius;
			this._nextX = MathUtil.random() * bound * 2 - bound;
		}

		let moveDest = new Vector(this._nextX,
				-World.Geometry.FieldHeightHalf + this._robot.radius + GOAL_DISTANCE);

		// ignore goal walls if ball is shot
		let obstacleTable: PathHelper.PathHelperParameters = {
			ignoreBall: true,
			ignoreGoals: false,
			ignoreDefenseArea: true,
			stopBallDistance: 0.05,
			messaging: this._messaging
		};
		if (Field.isInFriendlyDefenseArea(this._robot.pos, this._robot.radius)) {
			obstacleTable.ignoreFriendlyRobots = true;
			obstacleTable.ignoreOpponentRobots = true;
		}
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);
		this._robot.trajectory.update(ToTarget, moveDest, Math.PI / 2);
	}
}
