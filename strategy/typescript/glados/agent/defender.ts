import { FriendlyRobot } from "base/robot";
import * as World from "base/world";

import { Agent } from "glados/agent/base/agent";
import { BehaviorConstructor } from "glados/agent/base/behavior";
import { CenterBack } from "glados/agent/defender/centerback";
import { Default } from "glados/agent/defender/default";
import { HandleBall } from "glados/agent/defender/handleball";
import { ManMark } from "glados/agent/defender/manmark";
import { PassTarget } from "glados/agent/defender/passtarget";
import { PenaltyPassiveDefenderOffense } from "glados/agent/defender/penaltypassivedefenderoffense";
import { Piggy } from "glados/agent/defender/piggy";
import { ZoneDefense } from "glados/agent/defender/zonedefense";
import { BallEscort } from "glados/agent/shared/ballescort";
import { BreakPass } from "glados/agent/shared/breakpass";
import { PenaltyPassiveDefense } from "glados/agent/shared/penaltypassivedefense";
import { MessageType } from "glados/control/messaging";


export class Defender extends Agent {

	public getBehaviors(): BehaviorConstructor[] {
		return [
			PenaltyPassiveDefenderOffense,
			PenaltyPassiveDefense,
			PassTarget,
			BallEscort,
			HandleBall,
			ManMark,
			CenterBack,
			BreakPass,
			Piggy,
			ZoneDefense,
			Default
		];
	}

	public _run() {
		this._activeBehavior!._messaging.sendBroadcast(MessageType.defenderFlag);
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

	// worse rating if robot if farther away from own goal
	public rateRobot(): number {
		if (this._activeBehavior != undefined && this._activeBehavior.forceKeepingInPool()) {
			return Infinity;
		}
		let passInfoTable = this._messaging.receiveSingleSender(MessageType.passInfo)[1];
		if (passInfoTable) {
			for (let pass of passInfoTable) {
				if (pass.target === this._robot) {
					// We are a very bad defender if we want to accept this pass :O
					return -Infinity;
				}
			}
		}
		return -World.Geometry.FriendlyGoal.distanceTo(this._robot.pos);
	}
}
