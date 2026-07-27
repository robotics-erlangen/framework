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

import { Vector } from "base/vector";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import { Task } from "glados/task/base";
import { CurvedMaxAccel as ToTarget } from "glados/trajectory/curvedmaxaccel";
import * as PathHelper from "glados/trajectory/pathhelper";


export class MoveToStaticBall extends Task {
	private _rotation: number;
	private _distanceToBall: number;
	private _obstacleTable: PathHelper.PathHelperParameters;

	public constructor(behavior: Behavior, rotation = Math.PI / 2, distanceToBall = 0.03) {
		super(behavior);
		this._rotation = rotation;
		this._distanceToBall = distanceToBall;
		// slightly smaller obstacle to avoid that the target position is in the obstacle (by float standards)
		this._obstacleTable = { extraBallDistance: this._distanceToBall - 0.001, ignorePass: true, ignorePenaltyDistance: true };
	}

	public run() {
		let absDistToBall = this._distanceToBall + this._robot.radius + World.Ball.radius;
		let pos = World.Ball.pos - Vector.fromPolar(this._rotation, absDistToBall);

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable);

		this._robot.trajectory.update(ToTarget, pos, this._rotation);

		// send the position of the ball
		this._messaging.sendBroadcast(MessageType.attackPosition, World.Ball.pos);
	}
}
