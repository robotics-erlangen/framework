import { AbsTime, RelTime } from "base/timing";
import * as vis from "base/vis";
import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { Evacuate } from "glados/task/shared/evacuate";

const MAX_ACTIVE: RelTime = 0.5;

export class Default extends Behavior {
	private _outputCounter = 0;
	private _activeSince?: AbsTime;

	public check(): Behavior {
		return this;
	}

	protected _stop() {
		this._outputCounter = 0;
		this._activeSince = undefined;
	}

	protected _updateTask(): TaskAssignment<typeof Evacuate> {
		if (this._activeSince === undefined) {
			this._activeSince = World.Time;
		}

		if (World.Time - this._activeSince > MAX_ACTIVE) {
			vis.addCircle("a/a/default: Active", this._robot.pos, 0.12, vis.colors.orange, true, true);
			if (this._outputCounter++ % 500 === 0) {
				amun.log(`WARNING: a/a/default active for too long (robot ${this._robot.id}). This is probably a bug`);
			}
		}

		return [Evacuate];
	}
}
