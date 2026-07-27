/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

import { Vector } from "base/vector";
import * as World from "base/world";

import { BallLike, ObjectiveConstructor } from "glados/agent/base/objective";
import { Midfield } from "glados/agent/objective/midfield";
import { PassThroughDefense } from "glados/agent/objective/passthroughdefense";
import { Striker } from "glados/agent/objective/striker";
import { PassInfo } from "glados/util/attack";

const OBJECTIVES: ObjectiveConstructor[] = [
	Midfield,
	PassThroughDefense,
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
