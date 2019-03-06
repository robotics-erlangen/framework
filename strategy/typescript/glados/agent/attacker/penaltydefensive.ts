import * as Referee from "base/referee";
import { Vector } from "base/vector";
import * as World from "base/world";
import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MoveToPos } from "glados/task/shared/movetopos";

const G = World.Geometry;

export class PenaltyShootoutDefensive extends Behavior {
	private _penaltyStartTime: number | undefined = undefined;

	_stop() {
		this._penaltyStartTime = undefined;
	}

	check(): boolean {
		let isPenalty = World.RefereeState === "PenaltyDefensivePrepare" || World.RefereeState === "PenaltyDefensive";
		let isShootout = World.GameStage === "PenaltyShootout";
		return isShootout && (isPenalty || this._checkPenaltyOngoing());
	}

	private _checkPenaltyOngoing(): boolean {
		return this._penaltyStartTime != undefined && World.Time - this._penaltyStartTime < 15 && !Referee.isStopState();
	}

	_updateTask(): TaskAssignment<typeof MoveToPos> {
		if (World.RefereeState === "PenaltyDefensive" && this._penaltyStartTime == undefined) {
			// log("Start Time set")
			this._penaltyStartTime = World.Time;
		}

		return [MoveToPos, [new Vector(G.FieldWidthHalf - 0.75, G.FieldHeightHalf - 0.75)]];
	}
}
