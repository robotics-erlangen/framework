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

import { Speed, Vector } from "base/vector";

import { Behavior } from "glados/agent/base/behavior";
import { Shoot } from "glados/task/ability/shoot";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";


interface Ball {
	speed: Speed;
}

export class PenaltyShootout extends Task {
	private _shoot: Shoot;

	private _ball: Ball;

	public constructor(behavior: Behavior, ball: Ball) {
		super(behavior);
		this._ball = ball;
		this._shoot = new Shoot(this);
	}

	public run() {
		const obstacleTable = {
			task: this,
		};
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);
		let shootlength = (0.2 + this._robot.speed.length() * 0.4);
		let shootpos = new Vector(0, shootlength) * 0.7 + this._ball.speed / 3 * 0.3;
		shootpos = shootpos.withX(-shootpos.x / 2);
		this._shoot.shoot(shootpos + this._robot.pos, shootlength);
	}
}
