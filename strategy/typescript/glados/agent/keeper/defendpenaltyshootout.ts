import * as Referee from "base/referee";
import * as World from "base/world";
import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { Keeper } from "glados/task/keeper/keeper";
import { RandomKeeper } from "glados/task/keeper/randomkeeper";
import { ShootoutKeeper } from "glados/task/keeper/shootoutkeeper";

const G = World.Geometry;

const CRITICAL_DISTANCE = 4;


export class DefendPenaltyShootout extends Behavior {
	_penaltyStartTime: number | undefined;

	_stop() {
		this._penaltyStartTime = undefined;
	}

	check() {
		// log("1: "+tostring(World.GameStage == "PenaltyShootout"))
		// log("2: "+tostring(World.RefereeState == "PenaltyDefensivePrepare"))
		// log("3: "+tostring(World.RefereeState == "PenaltyDefensive"))
		// log("4: "+tostring(this._checkPenaltyOngoing()))
		return World.GameStage === "PenaltyShootout"
			&& (World.RefereeState === "PenaltyDefensivePrepare" || World.RefereeState === "PenaltyDefensive" || this._checkPenaltyOngoing());
	}

	_checkPenaltyOngoing(): boolean {
		return this._penaltyStartTime != undefined && World.Time - this._penaltyStartTime < 15 && !Referee.isStopState();
	}


	_updateTask(): TaskAssignment<typeof ShootoutKeeper> | TaskAssignment<typeof Keeper> {
		if (World.RefereeState === "PenaltyDefensive" && this._penaltyStartTime == undefined) {
			this._penaltyStartTime = World.Time;
		}

		for (let r of World.OpponentRobots) {
			if (World.RefereeState === "Game" && r.pos.distanceTo(G.FriendlyGoal) < CRITICAL_DISTANCE) {
				return [ShootoutKeeper];
			}
		}
		return [Keeper];
	}
}
