import * as debug from "base/debug";
import { FriendlyRobot } from "base/robot";
import * as World from "base/world";

import { ApplyForMainattacker } from "glados/agent/attacker/applyformainattacker";
import { Default } from "glados/agent/attacker/default";
import { DoubleTouchGuard } from "glados/agent/attacker/doubletouchguard";
import { Duel } from "glados/agent/attacker/duel";
import { DuelAssistant } from "glados/agent/attacker/duelassistant";
import { Exchange } from "glados/agent/attacker/exchange";
import { FreeKick } from "glados/agent/attacker/freekick";
import { Move } from "glados/agent/attacker/move";
import { PassTiming } from "glados/agent/attacker/passtiming";
import { PenaltyPassiveAttackerOffense } from "glados/agent/attacker/penaltypassiveattackeroffense";
import { PenaltyShootout } from "glados/agent/attacker/penaltyshootout";
import { Shoot } from "glados/agent/attacker/shoot";
import { Stop } from "glados/agent/attacker/stop";
import { Agent } from "glados/agent/base/agent";
import { CheckableConstructor } from "glados/agent/base/behavior";
import { BallEscort } from "glados/agent/shared/ballescort";
import { BreakPass } from "glados/agent/shared/breakpass";
import { PenaltyPassiveDefense } from "glados/agent/shared/penaltypassivedefense";
import { MessageType } from "glados/control/messaging";

export class Attacker extends Agent {
	beOffensive: boolean = false;

	_run() {
		if (this._activeBehavior) {
			this._messaging.sendBroadcast(MessageType.attackerFlag);
			this._messaging.sendToTrainerRepeated(MessageType.groupApplication, { name: "moves" });
		}

		debug.set("pool rating", this.rateRobot());
	}

	getBehaviors(): CheckableConstructor[] {
		return [
			ApplyForMainattacker,
			Move,
			Stop,
			PenaltyShootout,
			PenaltyPassiveDefense,
			PenaltyPassiveAttackerOffense,
			Exchange,
			FreeKick,
			DoubleTouchGuard,
			Duel,
			DuelAssistant,
			BallEscort,
			PassTiming,
			Shoot,
			BreakPass,
			Default
		];
	}

	public static takeRobot(robots: FriendlyRobot[]): FriendlyRobot | undefined {
		for (let robot of robots) {
			if (robot.isVisible) {
				return robot;
			}
		}
		return undefined;
	}

	public keepRobot(): boolean {
		return this._robot.isVisible && this._robot !== World.FriendlyKeeper && this._robot.userControl == undefined;
	}

	// worse rating if robot is farther away from opponent goal
	public rateRobot(): number {
		if (this._activeBehavior && this._activeBehavior.forceKeepingInPool()) {
			return Infinity;
		}
		if (this._messaging.receiveTrainer(MessageType.mainAttacker) === this._robot) {
			return 0;
		}
		return -World.Geometry.OpponentGoal.distanceTo(this._robot.pos);
	}
}
