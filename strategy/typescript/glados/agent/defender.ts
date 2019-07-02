import { FriendlyRobot } from "base/robot";
import * as World from "base/world";

import { Agent } from "glados/agent/base/agent";
import { Behavior } from "glados/agent/base/behavior";
import { CenterBack } from "glados/agent/defender/centerback";
import { Default } from "glados/agent/defender/default";
import { HandleBall } from "glados/agent/defender/handleball";
import { ManMark } from "glados/agent/defender/manmark";
import { Penalty } from "glados/agent/defender/penalty";
import { Piggy } from "glados/agent/defender/piggy";
import { ZoneDefense } from "glados/agent/defender/zonedefense";
import { BallEscort } from "glados/agent/shared/ballescort";
import { RescueFromDefenseArea } from "glados/agent/shared/rescuefromdefensearea";
import { MessageType } from "glados/control/messaging";

export class Defender extends Agent {

	public getBehaviors(): (new (a: Agent) => Behavior)[] {
		return [
			RescueFromDefenseArea,
			Penalty,
			BallEscort,
			HandleBall,
			ManMark,
			CenterBack,
			Piggy,
			ZoneDefense,
			Default
		];
	}

	public _run() {
		(this._activeBehavior as Behavior)._messaging.sendBroadcast(MessageType.defenderFlag);
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
		return -World.Geometry.FriendlyGoal.distanceTo(this._robot.pos);
	}
}
