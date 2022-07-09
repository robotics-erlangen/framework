import { Vector } from "base/vector";
import * as World from "base/world";

import { BallLike, ObjectiveConstructor } from "glados/agent/base/objective";
import { Midfield } from "glados/agent/objective/midfield";
import { Striker } from "glados/agent/objective/striker";
import { PassInfo } from "glados/util/attack";

const OBJECTIVES: ObjectiveConstructor[] = [
	Midfield,
	Striker,
];

export const selectNewObjective: (ball: BallLike) => ObjectiveConstructor | undefined =
	(ball) => OBJECTIVES.find((ctor) => ctor.canStart(ball));

export function nextBallPosition(lastIncomingPassInfo?: PassInfo): Readonly<Vector> {
	return World.RefereeState === "BallPlacementOffensive"
		? World.BallPlacementPos!
		: lastIncomingPassInfo
		? lastIncomingPassInfo.ballPos
		: World.Ball.pos;
}
