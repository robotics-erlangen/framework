import * as World from "base/world";
import {Behavior} from "glados/agent/base/behavior";
import {Keeper} from "glados/task/keeper/keeper";
import {Task} from "glados/task/base";
// import {RandomKeeper} from "glados/task/keeper/randomkeeper";

export class Default extends Behavior {
	check (): boolean {
		return true;
	}

	_updateTask (): [Task] {
		if (World.GameStage == "PenaltyShootout" && World.RefereeState === "PenaltyDefensive") {
			return [Keeper]; // RandomKeeper;
		} else {
			return [Keeper];
		}
	}
}