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
import * as debugCommands from "base/debugcommands";
import * as field from "base/field";
import * as geom from "base/geom";
import { Obstacle } from "base/path";
import * as Referee from "base/referee";
import { FriendlyRobot } from "base/robot";
import { Vector } from "base/vector";
import * as World from "base/world";

import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import * as Ball from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import { MoveToPos } from "glados/task/shared/movetopos";
import { TestShoot } from "glados/test/task/testshoot";

const enum State {
	WAIT_FOR_BALL_POS = "WAIT_FOR_BALL_POS",
	AIM_AT_FIRST_CORNER = "AIM_AT_FIRST_CORNER",
	AIM_AT_SECOND_CORNER = "AIM_AT_SECOND_CORNER",
	SHOOT = "SHOOT"
}

const EXTENDED_BALL_OBSTACLE: Obstacle = {
	type: "circle",
	center: World.Ball.pos,
	radius: 2 * World.Ball.radius,
	name: "g/t/feintkeepertest: Ball"
};

const TARGET_IN_GOAL_OFFSET = 0.25;
const BALL_EXTRA_DISTANCE = 0.01;
const SHOOTSPEED = 6.5;
const FIRST_CORNER_TIME = 1;
const TARGET_POS_EPSILON = 0.01;
const TARGET_DIR_EPSILON = geom.degreeToRadian(10);

export class FeintKeeperTest extends Move {
	public static readonly MIN_ROBOTS = 1;
	public static readonly MAX_ROBOTS = 1;
	public static readonly ALLOW_EXTRA_ATTACKERS = false;

	private _state: State = State.WAIT_FOR_BALL_POS;
	private _firstCorner: Vector = World.Geometry.OpponentGoalLeft;
	private _secondCorner: Vector = World.Geometry.OpponentGoalRight;
	private _timer: number = 0;
	private _lastWasInOpponentGoal: boolean = false;
	private _lastWasInOpponentDefense: boolean = false;
	private _lastWasStopState: boolean = false;
	private _restart: boolean = true;

	public static canStart(): boolean {
		return true;
	}

	public canContinue(): boolean {
		return true;
	}

	protected _updateTasks(): MoveParameters {
		if (field.isInOpponentGoal(World.Ball.pos) && !this._lastWasInOpponentGoal ||
			!field.isInOpponentDefenseArea(World.Ball.pos, World.Ball.radius) && this._lastWasInOpponentDefense) {
			debugCommands.sendRefereeCommand("Stop");
		}

		let taskAssignments = new Map<FriendlyRobot, Assignment>();
		this._state = this._nextState();

		debug.set("state", this._state);

		let robot = this._robots[0];
		let shootTarget = this._secondCorner + (World.Geometry.OpponentGoal - this._secondCorner).withLength(TARGET_IN_GOAL_OFFSET);



		switch (this._state) {
			case State.AIM_AT_FIRST_CORNER: {
				let targetPos = World.Ball.pos + (World.Ball.pos - this._firstCorner).withLength(
					robot.radius + 2 * World.Ball.radius + BALL_EXTRA_DISTANCE
				);
				taskAssignments[robot] = Assignment.create({
					class: MoveToPos,
					params: [{
						pos: targetPos,
						dir: (this._firstCorner - targetPos).angle(),
						customObstacles: [EXTENDED_BALL_OBSTACLE]
					}],
					restart: this._restart
				});
				break;
			}
			case State.WAIT_FOR_BALL_POS:
			case State.AIM_AT_SECOND_CORNER: {
				let targetPos = World.Ball.pos + (World.Ball.pos - shootTarget).withLength(
					robot.radius + 2 * World.Ball.radius + BALL_EXTRA_DISTANCE
				);

				taskAssignments[robot] = Assignment.create({
					class: MoveToPos,
					params: [{
						pos: targetPos,
						dir: (shootTarget - targetPos).angle(),
						customObstacles: [EXTENDED_BALL_OBSTACLE],
					}],
					restart: this._restart
				});
				break;
			}

			case State.SHOOT: {
				let shotBall = {
					pos: World.Ball.pos,
					speed: (shootTarget - World.Ball.pos).withLength(SHOOTSPEED),
					maxSpeed: SHOOTSPEED,
					radius: World.Ball.radius
				};

				taskAssignments[robot] = Assignment.create({
					class: TestShoot,
					params: [
						shootTarget,
						Physics.ballAtTime(shotBall, Physics.checkedBallRollTime(shotBall, shootTarget)).speed.length()
					],
					restart: this._restart
				});
				break;
			}
		}

		this._lastWasInOpponentGoal = field.isInOpponentGoal(World.Ball.pos);
		this._lastWasInOpponentDefense = field.isInOpponentDefenseArea(World.Ball.pos, World.Ball.radius);
		this._lastWasStopState = Referee.isStopState();

		return {
			assignments: taskAssignments,
			mainAttacker: robot
		};
	}

	private _nextState(): State {
		switch (this._state) {
			case State.WAIT_FOR_BALL_POS: {
				if (!Referee.isStopState() && this._lastWasStopState) {
					this._timer = World.Time;
					this._restart = true;
					return State.AIM_AT_FIRST_CORNER;
				}
				if (Referee.isStopState()) {
					this._restart = true;
					return State.WAIT_FOR_BALL_POS;
				}
				this._restart = false;
				return State.WAIT_FOR_BALL_POS;
			}

			case State.AIM_AT_FIRST_CORNER: {
				if (World.Time - this._timer > FIRST_CORNER_TIME) {
					this._restart = true;
					return State.AIM_AT_SECOND_CORNER;
				}
				if (Referee.isStopState()) {
					this._restart = true;
					return State.WAIT_FOR_BALL_POS;
				}
				this._restart = false;
				return State.AIM_AT_FIRST_CORNER;
			}

			case State.AIM_AT_SECOND_CORNER: {
				let robot = this._robots[0];
				let shootTarget = this._secondCorner + (World.Geometry.OpponentGoal - this._secondCorner).withLength(TARGET_IN_GOAL_OFFSET);
				let targetPos = World.Ball.pos + (World.Ball.pos - shootTarget).withLength(
					robot.radius + 2 * World.Ball.radius + BALL_EXTRA_DISTANCE
				);
				if (
					robot.pos.distanceTo(targetPos) < TARGET_POS_EPSILON &&
					Math.abs(geom.getAngleDiff(robot.dir, (shootTarget - robot.pos).angle())) < TARGET_DIR_EPSILON
				) {
					this._restart = true;
					return State.SHOOT;
				}
				if (Referee.isStopState()) {
					this._restart = true;
					return State.WAIT_FOR_BALL_POS;
				}
				this._restart = false;
				return State.AIM_AT_SECOND_CORNER;
			}

			case State.SHOOT: {
				if (Referee.isStopState()) {
					this._restart = true;
					return State.WAIT_FOR_BALL_POS;
				}
				if (Ball.isShot()) {
					this._restart = true;
					return State.WAIT_FOR_BALL_POS;
				}
				this._restart = false;
				return State.SHOOT;
			}
		}
	}
}
