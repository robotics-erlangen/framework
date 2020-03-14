import * as Referee from "base/referee";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import * as Robot from "glados/observer/robot";
import * as Attack from "glados/util/attack";
import * as Defense from "glados/util/defense";

export class ApplyForMainattacker extends Behavior {
	_applying: boolean = false;

	_stop() {
		this._applying = false;
	}

	check(): boolean {
		if (Referee.isOpponentPenaltyState()) {
			this._applying = false;
			return false;
		}

		// prevent double touches after a failed freekick by preventing the freekicking robot as mainattacker
		if (!Referee.isFriendlyFreeKickState() && Robot.ownStandardShooter() === this._robot) {
			this._applying = false;
			return false;
		}

		let applying = false;
		let [sender, passInfoTable] = this._messaging.receiveSingleSender(MessageType.passInfo, true);
		if (Attack.currentPlannedMainAttacker(sender, passInfoTable!) === this._robot) {
			this._applyForMainAttacker(undefined, undefined, 2);
			(this._agent as any).beOffensive = true;
			applying = true;
		} else {
			if (!Defense.dangerousBallTowardsDefense(true)) {
				this._applyForMainAttacker();
				(this._agent as any).beOffensive = false;
				applying = true;
			} else {
				let robotDistToGoal = this._robot.pos.distanceTo(World.Geometry.OpponentGoal);
				let ballDistToGoal = World.Ball.pos.distanceTo(World.Geometry.OpponentGoal);
				let maxDistDiff = (this._applying ? -1 : 1) * (World.Ball.radius + this._robot.shootRadius);
				if (robotDistToGoal - ballDistToGoal > maxDistDiff) {
					this._applyForMainAttacker();
					(this._agent as any).beOffensive = false;
					applying = true;
				}
			}
		}
		this._applying = applying;
		return false;
	}

	_updateTask(): any {
		throw new Error("This behavior is not supposed to run");
	}
}
