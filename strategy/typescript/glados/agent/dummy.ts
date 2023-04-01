import { FriendlyRobot } from "base/robot";

import { Exchange } from "glados/agent/attacker/exchange";
import { Agent } from "glados/agent/base/agent";
import { BehaviorConstructor } from "glados/agent/base/behavior";
import { Default } from "glados/agent/dummy/default";

export class Dummy extends Agent {

	public getBehaviors(): BehaviorConstructor[] {
		return [Exchange, Default];
	}

	public static takeRobot(robots: FriendlyRobot[]): FriendlyRobot | undefined {
		for (let robot of robots) {
			if (robot.isVisible && (!robot.canDribble || !robot.canShoot)) {
				return robot;
			}
		}
		return undefined;
	}

	public keepRobot(): boolean {
		return true;
	}

	public rateRobot(): number {
		return 0;
	}

}
