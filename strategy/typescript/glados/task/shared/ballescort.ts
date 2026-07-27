/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V., Tobias Heineken                *
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

import * as Field from "base/field";
import { Robot } from "base/robot";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";


export class BallEscort extends Task {
	private _opponentRobot: Robot | undefined;
	private _obstacleTable: PathHelper.PathHelperParameters;

	public constructor(behavior: Behavior, opponentRobot: Robot | undefined) {
		super(behavior);
		this._opponentRobot = opponentRobot;
		this._obstacleTable = {
			ignoreBall: false,
			extraBallDistance: 0.25,
			ignorePass: true,
			task: this,
		};
	}

	public run() {
		let target = this._opponentRobot ? this._opponentRobot.pos : World.Geometry.FriendlyGoal;
		let pos = World.Ball.pos + (target - World.Ball.pos).withLength(0.3 + this._robot.radius);

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable);
		let ballOutPos = Field.nextLineCut(World.Ball.pos, World.Ball.speed);
		if (ballOutPos) {
			this._robot.path.addLine(World.Ball.pos, ballOutPos, this._robot.radius, "Ballescort", PathHelper.PRIORITIES.INNER_BALL);
		}

		this._robot.trajectory.update(ToTarget, pos, (this._robot.pos - World.Ball.pos).angle());
	}
}
