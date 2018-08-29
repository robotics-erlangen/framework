import * as MathUtil from "base/mathutil";
import {Position, Vector} from "base/vector";
import {FriendlyRobot} from "base/robot";
import * as World from "base/world";
import {MoveToPos} from "glados/task/shared/movetopos";
import {Behavior} from "glados/agent/base/behavior";
import {Task} from "glados/task/base";

function calculateRescuePosition (robot: FriendlyRobot): Position {
	let x = MathUtil.sign(robot.pos.x) * (World.Geometry.DefenseStretchHalf + 0.2);
	let y = MathUtil.sign(robot.pos.y) * (World.Geometry.FieldHeightHalf + robot.radius + 0.02);
	return new Vector(x, y);
}

export class RescueFromDefenseArea extends Behavior {
	check (): boolean {
		return World.RefereeState !== "BallPlacementOffensive" && Math.abs(this._robot.pos.y) > World.Geometry.FieldHeightHalf  &&
			Math.abs(this._robot.pos.x) + 0.1 < Math.abs(calculateRescuePosition(this._robot).x);
	}

	_updateTask (): [typeof Task, any[]] {
		return [MoveToPos, [calculateRescuePosition(this._robot)]];
	}
}