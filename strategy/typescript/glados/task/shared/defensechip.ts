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

import * as debug from "base/debug";
import * as vis from "base/vis";
import * as World from "base/world";


import { Behavior } from "glados/agent/base/behavior";
import * as Physics from "glados/observer/physics";
import * as ObserverRobot from "glados/observer/robot";
import { ForceShoot } from "glados/task/ability/forceshoot";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";

const obstacleTable: PathHelper.PathHelperParameters = {
	ignoreBall: true,
	ignorePass: true,
	ignoreDefenseArea: false,
	ignoreOpponentDefenseArea: false,
};

export class DefenseChip extends Task {
	private _forceShoot: ForceShoot;

	public constructor(behavior: Behavior) {
		super(behavior);

		this._forceShoot = new ForceShoot(this);
	}

	public run() {
		if (!ObserverRobot.hadBall(this._robot, 0)) {
			this._forceShoot.forceShootTimer = undefined;
		}

		// rather move to close to the ball than not close enough
		const SAFETY_OFFSET = 0.02;
		let dribblerOffset = (World.Ball.pos - this._robot.pos).withLength(this._robot.shootRadius + World.Ball.radius - SAFETY_OFFSET);
		let moveDest = World.Ball.pos - dribblerOffset;
		let moveTime = moveDest.distanceTo(this._robot.pos) / Math.min(this._robot.speed.length(), 1);
		let futureBall = Physics.ballAtTime(World.Ball, moveTime);
		vis.addCircle("t/s/defensechip chase future ball", futureBall.pos, 0.03, vis.colors.orange);

		moveDest = futureBall.pos - dribblerOffset;
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);
		this._robot.trajectory.update(ToTarget, moveDest, (World.Ball.pos - this._robot.pos).angle());

		this._forceShoot.doForceShoot();
		this._robot.chip(2);
	}
}
