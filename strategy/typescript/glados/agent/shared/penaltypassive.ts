import * as Referee from "base/referee";
import * as World from "base/world";
import {Position, Vector} from "base/vector";
const G = World.Geometry;

import {MoveToPos} from "glados/task/shared/movetopos";
import {Behavior} from "glados/agent/base/behavior";
import {Task} from "glados/task/base";

export class PenaltyPassive extends Behavior {
	_penaltyStartTime: number | undefined = undefined;
	_contactPoint: Position | undefined = undefined;
	_shootGoalFlag: boolean = false;
	_forceDesperate: boolean = false;

	_stop () {
		this._penaltyStartTime = undefined;
		this._contactPoint = undefined;
		this._shootGoalFlag = false;
		this._forceDesperate = false;
	}

	check (): boolean {
		let isOffensivePenalty = World.RefereeState === "PenaltyOffensivePrepare" || World.RefereeState === "PenaltyOffensive"
		// local isDefensivePenalty = World.RefereeState == "PenaltyDefensivePrepare" or World.RefereeState == "PenaltyDefensive"
		let isShootout = World.GameStage === "PenaltyShootout"
		return isShootout && (isOffensivePenalty || this._checkPenaltyOngoing())
	}

	_checkPenaltyOngoing (): boolean {
		return this._penaltyStartTime != undefined && World.Time - this._penaltyStartTime < 15 && !Referee.isStopState();
	}

	_updateTask (): [typeof Task, any[]] {
		if (World.RefereeState == "PenaltyOffensive" && this._penaltyStartTime == undefined) {
			this._penaltyStartTime = World.Time
		}

		return [MoveToPos, [new Vector(G.FieldWidthHalf - 0.75, -G.FieldHeightHalf + 0.75)]];
	}
}