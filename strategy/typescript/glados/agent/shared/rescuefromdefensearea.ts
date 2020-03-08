import * as MathUtil from "base/mathutil";
import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MoveToPos } from "glados/task/shared/movetopos";

function calculateRescuePosition(robot: FriendlyRobot): Position {
	// large extra distance for the required defense area distance during freekicks
	let x = MathUtil.sign(robot.pos.x) * (World.Geometry.DefenseWidthHalf + 0.5);
	let y = MathUtil.sign(robot.pos.y) * (World.Geometry.FieldHeightHalf + robot.radius + 0.02);
	return new Vector(x, y);
}

export class RescueFromDefenseArea extends Behavior {
	check(): boolean {
		return World.RefereeState !== "BallPlacementOffensive" && Math.abs(this._robot.pos.y) > World.Geometry.FieldHeightHalf  &&
			Math.abs(this._robot.pos.x) + 0.05 < Math.abs(calculateRescuePosition(this._robot).x);
	}

	_updateTask(): TaskAssignment<typeof MoveToPos> {
		return [MoveToPos, [calculateRescuePosition(this._robot)]];
	}
}
