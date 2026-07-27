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

import * as Const from "base/constants";
import * as debug from "base/debug";
import * as geom from "base/geom";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

// import { MessageType } from "glados/control/messaging";
import { Behavior } from "glados/agent/base/behavior";
import { Shoot } from "glados/task/ability/shoot";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";


// const G = World.Geometry;


export class PenaltyShootoutGoal extends Task {
	private _shoot: Shoot;
	private _ball: { pos: Position; speed: Vector; radius: number };
	private _dest: Position;

	public constructor(behavior: Behavior, dest: Position, ball: { pos: Position; speed: Vector; radius: number } = World.Ball) {
		super(behavior);
		this._shoot = new Shoot(this);
		// this._pos = pos;
		this._ball = ball;
		this._dest = dest;
	}
	public run() {
		let robot = this._robot;
		let ball = this._ball;
		let obstacleTable: PathHelper.PathHelperParameters = {
			ignoreBall: true,
			ignorePass: true,
			ignoreDefenseArea: true,
			ignoreOpponentDefenseArea: false,
		};
		PathHelper.setDefaultObstaclesByTable(robot.path, robot, obstacleTable);
		let r = this._dest - robot.pos;
		let s = r.withLength(Const.maxBallSpeed) - ball.speed;
		if (Math.abs(geom.normalizeAngle(s.angle() - robot.dir)) < geom.degreeToRadian(1)) {
			robot.shoot(Const.maxBallSpeed - robot.speed.length());
		}
		let pos = ball.pos + ball.speed * 0.5;
		r = this._dest - robot.pos;
		s = r.withLength(Const.maxBallSpeed) - ball.speed;
		pos = pos + s.withLength(-robot.shootRadius - ball.radius);
		robot.trajectory.update(ToTarget, pos, s.angle(), undefined, ball.speed * 1.1);
		robot.setDribblerSpeed(0.5);
	}
}
