import { log } from "base/amun";
import { Position, Speed, Vector } from "base/vector";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";



const MAX_MOVEMENT_SPEED = 3.5;

const MIN_WAIT_TIME = 0.5;

export class PullBall extends Task {
	private static _isFinished: boolean = false;
	private static _isInitialised: boolean = false;

	private _movementSpeed : number;
	private _dribblerSpeed : number;
	private _acceleration : number;

	private _startPos : Position;
	private _target : Position;

	private _curTarget : Position;
	private _curMovementSpeed : number;

	private _startArrivalTime : number = 0;
	private _startArrivalFlag : boolean = false;


	constructor(behavior: Behavior, movementSpeed: number, dribblerSpeed: number, acceleration: number) {
		super(behavior);
		this._movementSpeed = movementSpeed;
		this._dribblerSpeed = dribblerSpeed;
		this._acceleration = acceleration;

		PullBall._isInitialised = true;

		this._target = this._robot.pos;
		this._target = this._target.withY(this._target.y - 1);

		this._startPos = this._robot.pos;

		this._curTarget = this._startPos;
		this._curMovementSpeed = this._movementSpeed;

	}

	public static isFinished(): boolean {
		return PullBall._isFinished;
	}
	public static setFinished() {
		PullBall._isFinished = true;
	}
	public static isInitialised(): boolean {
		return PullBall._isInitialised;
	}
	public static resetInitialisation() {
		PullBall._isInitialised = false;
	}

	public run() {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, { ignorePass: true, ignoreBall: true, ignoreDefenseArea: true, ignoreOpponentDefenseArea: true});


		if (this._robot.pos.distanceTo(this._curTarget) <= 0.01) {
			switch (this._curTarget) {
				case this._startPos:

					if (this._startArrivalFlag) {
						this._startArrivalFlag = false;
						this._startArrivalTime = World.Time;
					}
					if ((World.Time - this._startArrivalTime) < MIN_WAIT_TIME) {
						break;
					}

					this._curTarget = this._target;
					this._movementSpeed += 0.1;
					this._curMovementSpeed = this._movementSpeed;
					break;
				case this._target:
					this._startArrivalFlag = true;
					this._curTarget = this._startPos;
					log(`SuccessPull; MovementSpeed: ${this._movementSpeed}\tDribblerSpeed: ${this._dribblerSpeed}`);
					this._curMovementSpeed = 0.3;
					break;
			}

			if (this._movementSpeed > MAX_MOVEMENT_SPEED) {
				PullBall._isFinished = true;
			}
		}

		this._robot.setDribblerSpeed(this._dribblerSpeed);
		this._robot.trajectory.update(ToTarget, this._curTarget, (1 / 2) * Math.PI, this._curMovementSpeed, undefined, this._acceleration);
	}
}
