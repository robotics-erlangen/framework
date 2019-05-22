import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { Agent, Task } from "glados/task/base";
import { Direct } from "glados/trajectory/direct";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";


enum State {
	GO_TO_STARTPOSITION	= "GO_TO_STARTPOSITION",
	GO_TO_PULL			= "GO_TO_PULL",
	ENSURE_PULL_CONTACT	= "ENSURE_PULL_CONTACT",
	PULL_BACK			= "PULL_BACK",
	WAIT				= "WAIT",
	FINISHED			= "FINISHED",
}

const PULL_DRIBBLER_SPEED = 0.8;
const PULL_MOVEMENT_SPEED = 0.1;
const PULL_ACCELERATION = 0.1;

const ENSURE_CONTACT_MAX_TIME = 2;
const ENSURE_CONTACT_DRIBBLER_SPEED = 0.6;

const PULL_BACK_MAX_TIME = 2;
const MIN_WAIT_TIME = 1;

export class GetBallContact extends Task {

	private static _ready: boolean = false;
	private static _isInitialised = false;

	private static _staticTargetPos: Position = new Vector(0, 0);

	private _currentState: State;
	private _currentTargetPos: Position;
	private _startPos: Position;

	private _stateChangeTime = World.Time;

	private _initDribblerSpeed : number;

	private _offset: number = this._robot.shootRadius + World.Ball.radius;



	constructor(agent: Agent, dribblerSpeed: number) {
		super(agent);
		this._currentState = State.GO_TO_STARTPOSITION;
		GetBallContact._ready = false;

		this._currentTargetPos = World.Ball.pos.copy();
		this._startPos = this._currentTargetPos.copy();
		this._startPos.y = this._startPos.y - 0.3;

		this._initDribblerSpeed = dribblerSpeed;

		GetBallContact._staticTargetPos = this._currentTargetPos;


		GetBallContact._isInitialised = true;
	}



	run() {

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, { ignorePass: true, ignoreBall: true });
		this._currentTargetPos = World.Ball.pos.copy();

		let currentState = this._currentState;
		this._currentState = this._getNextState(currentState);

		if (this._currentState !== currentState) {
			this._stateChangeTime = World.Time;
		}


		switch (currentState) {
			case State.GO_TO_STARTPOSITION:
				this._robot.path.addCircle(World.Ball.pos.x, World.Ball.pos.y, World.Ball.radius * 4, undefined, PathHelper.Priorities.BALL);
				this._robot.trajectory.update(ToTarget, this._startPos, (1 / 2) * Math.PI, 1);

				break;
			case State.GO_TO_PULL:
				this._robot.setDribblerSpeed(ENSURE_CONTACT_DRIBBLER_SPEED);
				this._robot.trajectory.update(ToTarget, this._currentTargetPos, (1 / 2) * Math.PI, 0.2);

				break;
			case State.ENSURE_PULL_CONTACT:
				this._robot.setDribblerSpeed(ENSURE_CONTACT_DRIBBLER_SPEED);
				let speed = new Vector(0, PULL_MOVEMENT_SPEED);
				this._robot.trajectory.update(Direct, speed, undefined, PULL_MOVEMENT_SPEED);

				break;
			case State.PULL_BACK:
				let pos = this._robot.pos.copy();
				pos.y = pos.y - 1;
				this._robot.setDribblerSpeed(PULL_DRIBBLER_SPEED);
				this._robot.trajectory.update(ToTarget, pos, (1 / 2) * Math.PI, PULL_MOVEMENT_SPEED, undefined, PULL_ACCELERATION);

				break;
			case State.WAIT:
				let waitPos = this._robot.pos;
				this._robot.setDribblerSpeed(this._initDribblerSpeed);
				this._robot.trajectory.update(ToTarget, waitPos, (1 / 2) * Math.PI, PULL_MOVEMENT_SPEED);

				break;
			case State.FINISHED:
				GetBallContact._ready = true;
				break;
			default:
				break;
		}
	}

	private _getNextState(currentState: State): State {
		let nextState: State;


		switch (currentState) {
			case State.GO_TO_STARTPOSITION:
				nextState = State.GO_TO_STARTPOSITION;
				if (this._robot.pos.distanceTo(this._startPos) < 0.1) {
					nextState = State.GO_TO_PULL;
				}

				break;
			case State.GO_TO_PULL:
				nextState = State.GO_TO_PULL;

				if (this._robot.pos.distanceTo(this._currentTargetPos) < this._offset) {
					nextState = State.ENSURE_PULL_CONTACT;
				}

				break;
			case State.ENSURE_PULL_CONTACT:
				nextState = State.ENSURE_PULL_CONTACT;

				if (World.Time - this._stateChangeTime > ENSURE_CONTACT_MAX_TIME) {
					nextState = State.PULL_BACK;
				}

				break;
			case State.PULL_BACK:
				nextState = State.PULL_BACK;

				if (World.Time - this._stateChangeTime > PULL_BACK_MAX_TIME) {
					nextState = State.WAIT;
				}

				break;
			case State.WAIT:
				nextState = State.WAIT;

				if (World.Time - this._stateChangeTime > MIN_WAIT_TIME) {
					nextState = State.FINISHED;
				}

				break;
			case State.FINISHED:
				nextState = State.FINISHED;
				break;
			default:
				nextState = State.FINISHED;
				break;
		}

		return nextState;
	}

	public static _isDone(): boolean {
		return GetBallContact._ready;
	}
	public static isInitialised(): boolean {
		return GetBallContact._isInitialised;
	}
	public static resetInitialisation() {
		GetBallContact._isInitialised = false;
	}
	public static getTargetPos() {
		return GetBallContact._staticTargetPos;
	}
}
