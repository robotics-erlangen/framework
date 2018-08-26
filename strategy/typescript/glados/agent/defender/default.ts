import {Position, RelativePosition, Vector} from "base/vector";
import {MessageType} from "glados/control/messaging";
import {Behavior} from "glados/agent/base/behavior";
import {CenterBack} from "glados/task/defender/centerback"
import * as Defense from "glados/util/defense";
import {Task} from "glados/task/base";


export class Default extends Behavior {
	_lastTarget: {pos: Position, dir: RelativePosition | undefined} | undefined = undefined;
	_customBall: {pos: Position, dir: RelativePosition | undefined} = {pos: new Vector(0, 0), dir: new Vector(1, 0)};

	_stop () {
		this._lastTarget = undefined;
		this._customBall = {pos: new Vector(0, 0), dir: new Vector(1, 0)};
	}

	check (): boolean {
		return true;
	}

	_updateTask (): [typeof Task, any[], boolean] {
		let role = this._messaging.receiveTrainer(MessageType.roleAssignment);
		let target = (role != undefined && role.name == "CenterBack") ? role.params : this._customBall;
		let restart = target != this._lastTarget;
		this._lastTarget = target;

		if (target == this._customBall) {
			let [fieldPos, fieldDir] = Defense.calculateBallPositionField();
			this._customBall.pos = fieldPos;
			this._customBall.dir = fieldDir;
		}

		return [CenterBack, [ target ], restart];
	}
}