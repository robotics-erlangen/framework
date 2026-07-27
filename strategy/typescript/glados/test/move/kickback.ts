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
import { FriendlyRobot } from "base/robot";
import { Position } from "base/vector";
import * as World from "base/world";

import * as OBall from "glados/observer/ball";
import { Shoot } from "glados/task/ability/shoot";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";

const G = World.Geometry;

abstract class State {
	protected _robot: FriendlyRobot;
	protected _task: KickBackTest;

	public constructor(task: KickBackTest) {
		this._robot = task.behavior().agent().robot();
		this._task = task;
	}

	public abstract nextState(): State;
	public abstract run(): void;
}

class Waiting extends State {
	/**
	 * the position where the robots wait for the ball to reach MIN_CATCH_SPEED
	 */
	public static readonly WAIT_POS: Position = G.FriendlyGoal / 2;
	/**
	 * the speed the ball has to reach for the robot to start catching it
	 */
	public static readonly MIN_CATCH_SPEED: number = 1;

	public nextState(): State {
		if (World.Ball.isPositionValid()
				&& World.Ball.speed.lengthSq() >= Waiting.MIN_CATCH_SPEED * Waiting.MIN_CATCH_SPEED) {
			return new Shooting(this._task, World.Ball.pos);
		}
		return this;
	}

	public run() {
		this._robot.trajectory.update(ToTarget, Waiting.WAIT_POS, (World.Ball.pos - this._robot.pos).angle());
	}
}

class Shooting extends State {
	/**
	 * the position where the robots wait for the ball to reach MIN_CATCH_SPEED
	 */
	public static readonly TARGET_SPEED: number = 4;

	private _shoot: Shoot;
	private _startPos: Position;

	public constructor(task: KickBackTest, startPos: Position) {
		super(task);
		this._shoot = new Shoot(task);
		this._startPos = startPos;
	}

	public nextState(): State {
		if (OBall.isStanding() || !World.Ball.isPositionValid()) {
			return new Waiting(this._task);
		}
		return this;
	}

	public run() {
		this._shoot.shoot(this._startPos, Shooting.TARGET_SPEED);
	}
}

export class KickBackTest extends Task {

	private _state: State = new Waiting(this);

	public run() {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, { ignoreDefenseArea: true, ignoreOpponentDefenseArea: true, ignorePass: true });

		debug.set("state", this._state);
		this._state.run();
		this._state = this._state.nextState();
	}

}
