import * as MathUtil from "base/mathutil";
import {Position, Vector} from "base/vector";
import {FriendlyRobot} from "base/robot";
import * as World from "base/world";
import {MoveToPos} from "glados/task/shared/movetopos";
import {Behavior, TaskAssignment} from "glados/agent/base/behavior";

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

	_updateTask (): TaskAssignment<typeof MoveToPos> {
		return [MoveToPos, [calculateRescuePosition(this._robot)]];
	}
}