import { TrajectoryHandler, TrajectoryResult } from "base/trajectory";

// only works for hidden robots
export class Hidden extends TrajectoryHandler<[number, number, number]> {
	public update(speedForward: number, speedSide: number, omega: number): TrajectoryResult {
		if (this._robot.isVisible) {
			throw new Error("can only control invisible robots");
		}
		if (speedForward == undefined || speedSide == undefined || omega == undefined) {
			throw new Error("missing parameters!");
		}
		return [{ v_f: speedForward, v_s: speedSide, omega: omega }, this._robot.pos, this._robot.pos, 0];
	}
}
