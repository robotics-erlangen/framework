import * as MathUtil from "base/mathutil";
import { Position, Vector } from "base/vector";

import * as Physics from "glados/observer/physics";

export function timeToRating(time: number): number {
	if (time < 0) {
		return 1;
	} else {
		return 1 / (time + 1) ** 2;
	}
}

export function posToRating(robot: Physics.RobotLike, targetPos: Position) {
	return timeToRating(Physics.robotTimeToPos(robot, targetPos, new Vector(0, 0))[0]);
}

export function valueToRating(value: number, zero: number, one: number): number {
	return MathUtil.bound(0, (value - zero) / (one - zero), 1);
}
