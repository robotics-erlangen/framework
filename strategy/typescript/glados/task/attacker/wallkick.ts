import { Position, RelativePosition, Vector } from "base/vector";

import { Behavior } from "glados/agent/base/behavior";
import { WallkickAbility } from "glados/task/ability/wallkickability";
import { Task } from "glados/task/base";

export class Wallkick extends Task {
	private _placementPos: Position;
	private _wallkick: WallkickAbility;

	public constructor(behavior: Behavior, placementPos: Position) {
		super(behavior);
		this._placementPos = placementPos;

		this._wallkick = new WallkickAbility(this._robot, this._placementPos);
	}

	public run() {
		this._wallkick._wallkick(false);
	}
}
