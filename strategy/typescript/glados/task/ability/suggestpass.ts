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

import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { MessageType } from "glados/control/messaging";
import * as Physics from "glados/observer/physics";
import { Task } from "glados/task/base";

export class SuggestPass {
	private _robot: FriendlyRobot;
	private _task: Task;

	private get _messaging() {
		return this._task.behavior().agent().messaging();
	}

	public constructor(task: Task) {
		this._robot = task.behavior().agent().robot();
		this._task = task;
	}

	public suggestPass(destBallPos: Position, attackPos: Position = World.Ball.pos,
			relativeTime?: number, anonymous: boolean = false, chip: boolean = false) {
		// check for mainAttacker
		let mainAttacker = this._messaging.receiveTrainer(MessageType.mainAttacker);
		if (mainAttacker == undefined) {
			return;
		}

		let currentBallPos = attackPos;
		let robotPos = destBallPos + (destBallPos - currentBallPos).withLength(this._robot.shootRadius + World.Ball.radius);

		// calculate receive time
		let extraTime = 0.0;
		let moveTime = relativeTime != undefined ? relativeTime : Physics.robotTimeToPos(this._robot, robotPos, new Vector(0, 0))[0] + extraTime;
		let receiveTime = World.Time + moveTime;

		vis.addCircle("t/a/suggestpass: passSuggestion", robotPos, 0.1, vis.colors.redHalf, true);
		vis.addCircle("t/a/suggestpass: passSuggestion", destBallPos, World.Ball.radius, vis.colors.redHalf, true);

		anonymous = anonymous || false;
		this._messaging.sendBroadcast(MessageType.passSuggestion,
			{ ballPos: destBallPos, time: receiveTime, anonymous: anonymous, chip: chip, manual: false });
	}

	public suggestPassRobotPosition(destRobotPos: Position, attackPos: Position = World.Ball.pos, relativeTime?: number,
			anonymous?: boolean) {
		let destBallPos = destRobotPos + (attackPos - destRobotPos).withLength(this._robot.shootRadius + World.Ball.radius);
		this.suggestPass(destBallPos, attackPos, relativeTime, anonymous);
	}
}
