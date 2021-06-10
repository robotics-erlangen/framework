import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";

/** Drive nowhere but evade obstacles */
export class Evacuate extends Task {
	private _obstacleTable: PathHelper.PathHelperParameters = {
		task: this,
	};

	run() {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable);

		this._robot.trajectory.update(ToTarget, this._robot.pos, this._robot.dir);
	}
}

