import * as World from "base/world";
import {Behavior, TaskAssignment} from "glados/agent/base/behavior";
import {Keeper} from "glados/task/keeper/keeper";
// import {RandomKeeper} from "glados/task/keeper/randomkeeper";

export class Default extends Behavior {
	check (): boolean {
		return true;
	}

	_updateTask (): TaskAssignment<typeof Keeper> { // | TaskAssignment<typeof RandomKeeper> {
		if (World.GameStage == "PenaltyShootout" && World.RefereeState === "PenaltyDefensive") {
			return [Keeper];
			//return [RandomKeeper];
		} else {
			return [Keeper];
		}
	}
}