import * as Referee from "base/referee";
import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { Keeper } from "glados/task/keeper/keeper";
import { ShootoutKeeper } from "glados/task/keeper/shootoutkeeper";

const G = World.Geometry;

const CRITICAL_DISTANCE = 4;


export class DefendPenaltyShootout extends Behavior {

	check() {
		return Referee.isOpponentPenaltyState();
	}

	_updateTask(): TaskAssignment<typeof ShootoutKeeper> | TaskAssignment<typeof Keeper> {
		for (let r of World.OpponentRobots) {
			if (World.RefereeState === "Game" && r.pos.distanceTo(G.FriendlyGoal) < CRITICAL_DISTANCE) {
				return [ShootoutKeeper];
			}
		}
		return [Keeper];
	}
}
