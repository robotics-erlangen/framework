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

import * as Referee from "base/referee";
import { Vector, Position } from "base/vector";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { PenaltyPassiveDefense } from "glados/agent/shared/penaltypassivedefense";

const G = World.Geometry;

export class PenaltyPassiveAttackerOffense extends PenaltyPassiveDefense {
	protected _startPos: Position = new Vector(G.FieldWidth, G.FieldHeight) * 2;
	protected _endX = G.FieldWidth * -2.0;
	protected _endYOffset = -1.3;

	// min 1.0m behind ball, 1.5 just in case
	protected _yOffset = -1.5;

	public check(): Behavior | undefined {
		return Referee.isFriendlyPenaltyState() ? this : undefined;
	}
}
