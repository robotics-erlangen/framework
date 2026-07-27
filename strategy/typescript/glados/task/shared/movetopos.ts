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

import * as debug from "base/debug";
import { Obstacle } from "base/path";
import { Position } from "base/vector";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { SuggestPass } from "glados/task/ability/suggestpass";
import { Task } from "glados/task/base";
import { CurvedMaxAccel } from "glados/trajectory/curvedmaxaccel";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";

export type Parameters = {
	pos: Position;
	dir?: number;
	endSpeedLength?: number;
	customObstacles?: Obstacle[];
	suggestPass?: boolean;
	ignoreDefaultObstacles?: boolean;
	ignoreBallPlacement?: boolean;
	ignoreBall?: boolean;
	useCMA?: boolean;
	maxSpeed?: number;
};

export class MoveToPos extends Task {
	private _pos: Position;
	private _dir: number;
	private _maxSpeed: number | undefined;
	private _endSpeedLength: number;
	private _obstacleTable: PathHelper.PathHelperParameters;
	private _customObstacles: Obstacle[]; // a list of obstacles to be added to the path, see base/path
	private _suggestPass: SuggestPass | undefined;
	private _useCMA: boolean;

	public constructor(behavior: Behavior, params: Parameters) {
		super(behavior);

		this._pos = params.pos;

		if (params.dir === undefined) {
			params.dir = (World.Ball.pos - params.pos).angle();
		}
		this._dir = params.dir;
		if (params.endSpeedLength === undefined) {
			params.endSpeedLength = 0;
		}
		this._endSpeedLength = params.endSpeedLength;
		if (params.customObstacles === undefined) {
			params.customObstacles = [];
		}
		this._customObstacles = params.customObstacles;

		const ignore = params.ignoreDefaultObstacles === true;
		this._obstacleTable = {
			ignoreBall: ignore || params.ignoreBall === true,
			ignoreDefenseArea: ignore,
			ignoreOpponentDefenseArea: ignore,
			task: this,
			ignorePass: this._messaging == undefined || ignore,
			ignoreBallPlacementObstacle: params.ignoreBallPlacement === true
		};

		if (params.suggestPass) {
			this._suggestPass = new SuggestPass(this);
		}
		this._useCMA = params.useCMA === true;
		this._maxSpeed = params.maxSpeed;
	}

	public run() {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable);
		debug.set("Target Pos", this._pos);
		debug.set("Use CMA", this._useCMA);
		debug.set("Custom Obstacles", this._customObstacles);

		for (let obstacle of this._customObstacles) {
			this._robot.path.addObstacle(obstacle);
		}

		let endSpeed = (this._pos - this._robot.pos).withLength(this._endSpeedLength);
		let time;
		if (this._useCMA) {
			time = this._robot.trajectory.update(CurvedMaxAccel, this._pos, this._dir, this._maxSpeed, endSpeed).timeToDest;
		} else {
			time = this._robot.trajectory.update(ToTarget, this._pos, this._dir, this._maxSpeed, endSpeed).timeToDest;
		}

		if (this._suggestPass != undefined) {
			this._suggestPass.suggestPassRobotPosition(this._pos, undefined, time);
		}
	}
}
