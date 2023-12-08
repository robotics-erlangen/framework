import { log } from "base/amun";
import { Position, Speed, Vector } from "base/vector";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";


enum State {
	GO_TO_X0	= "GO_TO_X0",
	GO_TOP		= "GO_TOP",
	GO_BOT		= "GO_BOT",
	FINISHED	= "FINISHED",
}

const MAX_MOVEMENT_SPEED = 3.5;

const PULL_DRIBBLER_SPEED = 0.8;
const PULL_MOVEMENT_SPEED = 0.3;
const PULL_ACCELERATION = 0.1;

const MIN_WAIT_TIME = 1;

const AMPLITUDE = 1;
const X0 = 0;
const Y0 = World.Geometry.FieldWidthQuarter;

export class MoveSidewards extends Task {
	private static _isFinished: boolean = false;
	private static _isInitialised: boolean = false;

	private _currentState: State = State.GO_TO_X0;

	private _movementSpeed: number;
	private _dribblerSpeed: number;
	private _acceleration: number;

	private _x0ArrivalFlag: boolean = true;
	private _topArrivalFlag: boolean = false;
	private _botArrivalFlag: boolean = false;
	private _x0ArrivalTime: number = 0;
	private _topArrivalTime: number = 0;
	private _botArrivalTime: number = 0;


	public constructor(behavior: Behavior, movementSpeed: number, dribblerSpeed: number, acceleration: number) {
		super(behavior);
		this._movementSpeed = movementSpeed;
		this._dribblerSpeed = dribblerSpeed;
		this._acceleration = acceleration;

		MoveSidewards._isInitialised = true;
	}

	public static isFinished(): boolean {
		return MoveSidewards._isFinished;
	}
	public static setFinished() {
		MoveSidewards._isFinished = true;
	}
	public static isInitialised(): boolean {
		return MoveSidewards._isInitialised;
	}
	public static resetInitialisation() {
		MoveSidewards._isInitialised = false;
	}

	public run() {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, { ignorePass: true, ignoreBall: true, ignoreDefenseArea: true, ignoreOpponentDefenseArea: true });

		let currentState = this._currentState;
		this._currentState = this._getNextState(currentState);

		switch (currentState) {
			case State.GO_TO_X0:
				let x0target = new Vector(X0, Y0);
				if (this._x0ArrivalFlag) {
					this._robot.setDribblerSpeed(PULL_DRIBBLER_SPEED);
				} else {
					this._robot.setDribblerSpeed(this._dribblerSpeed);
				}
				this._robot.trajectory.update(ToTarget, x0target, (1 / 2) * Math.PI, PULL_MOVEMENT_SPEED, undefined, PULL_ACCELERATION);

				break;

			case State.GO_TOP:
				let topTarget = new Vector(AMPLITUDE, Y0);
				this._robot.setDribblerSpeed(this._dribblerSpeed);
				this._robot.trajectory.update(ToTarget, topTarget, (1 / 2) * Math.PI, this._movementSpeed, undefined, this._acceleration);

				break;

			case State.GO_BOT:
				let botTarget = new Vector(-AMPLITUDE, Y0);
				this._robot.setDribblerSpeed(this._dribblerSpeed);
				this._robot.trajectory.update(ToTarget, botTarget, (1 / 2) * Math.PI, this._movementSpeed, undefined, this._acceleration);

				break;

			case State.FINISHED:
				MoveSidewards._isFinished = true;
				break;
			default:
				break;
		}

	}

	private _getNextState(currentState: State): State {
		let nextState: State;

		switch (currentState) {
			case State.GO_TO_X0:
				nextState = State.GO_TO_X0;

				if (Math.abs(this._robot.pos.x) < X0 + 0.05 && (this._robot.pos.y < Y0 + 0.05 && this._robot.pos.y > Y0 - 0.05)) {
					if (this._x0ArrivalFlag) {
						this._x0ArrivalFlag = false;
						this._x0ArrivalTime = World.Time;
					}
					if (World.Time - this._x0ArrivalTime < MIN_WAIT_TIME) {
						break;
					}

					nextState = State.GO_TOP;
					this._topArrivalFlag = true;
				}

				break;

			case State.GO_TOP:
				nextState = State.GO_TOP;

				if (this._robot.pos.x > AMPLITUDE - 0.05) {
					if (this._topArrivalFlag) {
						this._topArrivalFlag = false;
						this._topArrivalTime = World.Time;
					}
					if ((World.Time - this._topArrivalTime) < MIN_WAIT_TIME) {
						break;
					}
					log(`SuccessMoveSide; MovementSpeed: ${this._movementSpeed}\tDribblerSpeed: ${this._dribblerSpeed}`);
					this._movementSpeed += 0.1;
					nextState = State.GO_BOT;
					this._botArrivalFlag = true;
				}

				break;

			case State.GO_BOT:
				nextState = State.GO_BOT;

				if (this._robot.pos.x < -AMPLITUDE + 0.05) {
					if (this._botArrivalFlag) {
						this._botArrivalFlag = false;
						this._botArrivalTime = World.Time;
					}
					if ((World.Time - this._botArrivalTime) < MIN_WAIT_TIME) {
						break;
					}
					log(`SuccessMoveSide; MovementSpeed: ${this._movementSpeed}\tDribblerSpeed: ${this._dribblerSpeed}`);
					this._movementSpeed += 0.1;
					nextState = State.GO_TOP;
					this._topArrivalFlag = true;
				}

				break;

			case State.FINISHED:
				nextState = State.FINISHED;
				break;
			default:
				nextState = State.FINISHED;
				break;
		}

		if (this._movementSpeed > MAX_MOVEMENT_SPEED) {
			nextState = State.FINISHED;
		}

		return nextState;
	}
}


