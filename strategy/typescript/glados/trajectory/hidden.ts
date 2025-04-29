import { TrajectoryCommand } from "base/robot";
import { NoTrajectoryResult, TrajectoryHandler } from "base/trajectory";

// only works for hidden robots
export class Hidden extends TrajectoryHandler<[number, number, number], NoTrajectoryResult> {
	public update(speedForward: number, speedSide: number, omega: number): [TrajectoryCommand, NoTrajectoryResult] {
		if (this._robot.isVisible) {
			throw new Error("can only control invisible robots");
		}
		if (speedForward == undefined || speedSide == undefined || omega == undefined) {
			throw new Error("missing parameters!");
		}

		const trajectoryCommand = { v_f: speedForward, v_s: speedSide, omega: omega };
		return [trajectoryCommand, new NoTrajectoryResult(this._robot)];
	}
}
