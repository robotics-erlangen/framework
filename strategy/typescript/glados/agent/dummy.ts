import { FriendlyRobot } from "base/robot";

import { FeintPass } from "glados/agent/attacker/feintpass";
import { RemoveExtraRobot } from "glados/agent/attacker/removeextrarobot";
import { Agent } from "glados/agent/base/agent";
import { BehaviorConstructor } from "glados/agent/base/behavior";
import { Default } from "glados/agent/dummy/default";
import * as DummyUtil from "glados/util/dummy";

export class Dummy extends Agent {

	public getBehaviors(): BehaviorConstructor[] {
		return [
			RemoveExtraRobot,
			FeintPass,
			Default
		];
	}

	public static takeRobot(robots: FriendlyRobot[]): FriendlyRobot | undefined {
		for (let robot of robots) {
			if (robot.isVisible && DummyUtil.isDummy(robot)) {
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
