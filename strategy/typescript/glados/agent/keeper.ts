import {FriendlyRobot} from "base/robot";
import * as World from "base/world";
import {Behavior} from "glados/agent/base/behavior";
import {Agent} from "glados/agent/base/agent";
import {Default} from "glados/agent/keeper/default"
import {HandleBall} from "glados/agent/keeper/handleball"
import {DefendPenaltyShootout} from "glados/agent/keeper/defendpenaltyshootout"

export class Keeper extends Agent {

	getBehaviors(): any[] {
		return [
			DefendPenaltyShootout,
			HandleBall,
			Default
		];
	}

	static takeRobot (robots: FriendlyRobot[]): FriendlyRobot | undefined {
		for (let robot of robots) {
			if (robot == World.FriendlyKeeper) {
				return robot;
			}
		}
		return undefined;
	}

	public keepRobot (): boolean {
		return this._robot.isVisible && this._robot == World.FriendlyKeeper && this._robot.userControl == undefined;
	}

	public rateRobot (): number {
		return 1;
	}
}