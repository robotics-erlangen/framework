import {FriendlyRobot} from "base/robot";
import {Agent} from "glados/agent/base/agent";
import {Behavior} from "glados/agent/base/behavior";
import {Default} from "glados/agent/hidden/default"


export class Hidden extends Agent {

	public getBehaviors(): any[] {
		return [Default];
	}

	public static takeRobot (robots: FriendlyRobot[]): FriendlyRobot | undefined {
		for (let robot of robots) {
			if (!robot.isVisible) {
				return robot;
			}
		}
		return undefined;
	}

	public keepRobot (): boolean {
		return !this._robot.isVisible && this._robot.userControl == undefined;
	}

	public rateRobot (): number {
		return 0;
	}
}