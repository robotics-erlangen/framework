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

import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import * as Physics from "glados/observer/physics";
import { CatchBall } from "glados/task/ability/catchball";
import { SuggestPass } from "glados/task/ability/suggestpass";
import { Task } from "glados/task/base";
import { CurvedMaxAccel } from "glados/trajectory/curvedmaxaccel";
import * as PathHelper from "glados/trajectory/pathhelper";

// Warning: This task has some very strict precoditions.
// 1. It will only work if you have the ball in the dribbler at the start
// 2. you have to make sure (somehow) that the (robotPos - waypoint[2]  {returned by path}).absoluteAngleDiff(viewDir) is pretty small

let obstacleTable: PathHelper.PathHelperParameters = {
	ignoreBall: true,
	ignorePass: true
};

export class Dribble extends Task {
	private _pos: Position;
	private _dir: number;
	private _suggestPassFlag: boolean;
	private _endSpeedLength: number;

	private _catchBall: CatchBall;
	private _suggestPass: SuggestPass;

	public constructor(behavior: Behavior, pos: Position, suggestPass = false, endSpeedLength = 0) {
		super(behavior);
		this._pos = pos;
		this._dir = (pos - this._robot.pos).angle();
		this._suggestPassFlag = suggestPass;
		this._endSpeedLength = endSpeedLength;

		this._catchBall = new CatchBall(this);
		this._suggestPass = new SuggestPass(this);
	}

	public run() {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);
		this._robot.setDribblerSpeed(0.7);

		let time;
		if (World.Ball.pos.distanceTo(this._robot.pos) > this._robot.radius + World.Ball.radius + 0.05) {
			let catchTime = this._catchBall.catchBall(this._pos, 0)[0];
			time = catchTime + Physics.robotTimeToPos(this._robot, this._pos, new Vector(0, 0))[0];
		} else {
			let endSpeed = (this._pos - this._robot.pos).withLength(this._endSpeedLength);
			time = this._robot.trajectory.update(CurvedMaxAccel, this._pos, this._dir, 1.0, endSpeed, undefined, true).timeToDest;
		}


		if (this._suggestPassFlag) {
			this._suggestPass.suggestPass(this._pos, undefined, time);
		}
	}
}
