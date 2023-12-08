import { Position, RelativePosition, Vector } from "base/vector";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { CenterBack } from "glados/task/defender/centerback";
import * as Defense from "glados/util/defense";


export class Default extends Behavior {
	private _customBall: { pos: Position; dir: RelativePosition | undefined } = { pos: new Vector(0, 0), dir: new Vector(1, 0) };

	protected _stop() {
		this._customBall = { pos: new Vector(0, 0), dir: new Vector(1, 0) };
	}

	public check(): Behavior | undefined {
		return this;
	}

	protected _updateTask(): TaskAssignment<typeof CenterBack> {
		let target = this._customBall;

		let [fieldPos, fieldDir] = Defense.calculateBallPositionField();
		this._customBall.pos = fieldPos;
		this._customBall.dir = fieldDir;

		return [CenterBack, [target]];
	}
}
