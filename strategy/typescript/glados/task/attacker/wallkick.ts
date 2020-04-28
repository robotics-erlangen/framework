import { Position, RelativePosition, Vector } from "base/vector";

import { WallkickAbility } from "glados/task/ability/wallkickability";
import { Agent, Task } from "glados/task/base";

export class Wallkick extends Task {
	private _placementPos: Position;
	private _wallkick: WallkickAbility;

	constructor(agent: Agent, placementPos: Position) {
		super(agent);
		this._placementPos = placementPos;

		this._wallkick = new WallkickAbility(this._robot, this._placementPos);
	}

	run() {
		this._wallkick._wallkick(false);
	}
}
