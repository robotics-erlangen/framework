import { FriendlyRobot } from "base/robot";

import { Agent } from "glados/agent/base/agent";
import { Behavior } from "glados/agent/base/behavior";
import { Default } from "glados/agent/manual/default";


export class Manual extends Agent {

	public getBehaviors(): any[] {
		return [Default];
	}

	public static takeRobot(robots: FriendlyRobot[]): FriendlyRobot | undefined {
		for (let robot of robots) {
			// take robots which get command from an input device
			if (robot.userControl) {
				return robot;
			}
		}
		return undefined;
	}

	public keepRobot(): boolean {
		return this._robot.userControl != undefined;
	}

	public rateRobot(): number {
		return 0;
	}
}
