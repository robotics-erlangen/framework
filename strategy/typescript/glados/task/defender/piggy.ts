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

import { Robot } from "base/robot";
import { Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import * as Physics from "glados/observer/physics";
import { SuggestPass } from "glados/task/ability/suggestpass";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";
import * as UtilDefense from "glados/util/defense";

export class Piggy extends Task {
	private _targetRobot: Robot;
	private _suggestPass: SuggestPass;

	public constructor(behavior: Behavior, targetRobot: Robot) {
		super(behavior);
		if (targetRobot == undefined) {
			throw new Error("Piggy task needs a target robot");
		}
		this._targetRobot = targetRobot;
		this._suggestPass = new SuggestPass(this);
	}

	public run() {
		const obstacleTable = { task: this };
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);

		let piggyPos = UtilDefense.piggyPos(this._targetRobot);

		this._messaging.sendBroadcast(MessageType.moveDest, piggyPos);

		// Request pass to position opposite of you
		let requestedPassPos = piggyPos + (piggyPos - this._targetRobot.pos).withLength(0.3);

		vis.addCircle("piggy/requestedPass", requestedPassPos, 0.1);

		if (requestedPassPos.y >= -World.Geometry.FieldHeightQuarter) {
			let passTime = Physics.robotTimeToPos(this._robot, piggyPos, new Vector(0, 0));
			this._suggestPass.suggestPass(requestedPassPos, World.Ball.pos, passTime[0]);
		}

		let dir = (World.Ball.pos - this._targetRobot.pos).angle();
		this._robot.trajectory.update(ToTarget, piggyPos, dir, undefined, this._targetRobot.speed);
	}
}
