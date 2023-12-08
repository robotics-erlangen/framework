import { log } from "base/amun";
import { Position, Speed, Vector } from "base/vector";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { Task } from "glados/task/base";
import { Direct } from "glados/trajectory/direct";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";


const ROTATION_ACCELERATION_STEP_TIME = 0.3;

const MAX_ROTATION_SPEED = 4;

export class RotateWithBall extends Task {
	private static _isFinished: boolean = false;
	private static _isInitialised: boolean = false;


	private _rotationSpeed: number;
	private _dribblerSpeed: number;
	private _acceleration: number;
	private _curRotationSpeed: number = 0;

	private _lastTime: number = World.Time;

	private _finishedRound: boolean = true;


	public constructor(behavior: Behavior, rotationSpeed: number, dribblerSpeed: number, acceleration: number) {
		super(behavior);

		this._rotationSpeed = rotationSpeed;
		this._dribblerSpeed = dribblerSpeed;
		this._acceleration = acceleration;

		RotateWithBall._isInitialised = true;
	}

	public static isFinished(): boolean {
		return RotateWithBall._isFinished;
	}
	public static setFinished() {
		RotateWithBall._isFinished = true;
	}
	public static isInitialised(): boolean {
		return RotateWithBall._isInitialised;
	}
	public static resetInitialisation() {
		RotateWithBall._isInitialised = false;
	}

	public run() {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, { ignorePass: true, ignoreBall: true, ignoreDefenseArea: true, ignoreOpponentDefenseArea: true });

		let targetPosition: Position = World.Ball.pos;
		let ownPosition: Position = this._robot.pos;
		let offset = this._robot.shootRadius + World.Ball.radius;
		let speed: Speed = new Vector(0, 0);

		let angle: number = (targetPosition - ownPosition).angle();
		let robotRotation: number = this._robot.dir;


		if (robotRotation < (1 / 4) * Math.PI && this._finishedRound) {
			// finished one rotation; increase rotation speed
			log(`SuccessRotate; RotationSpeed: ${this._curRotationSpeed}\tDribblerSpeed: ${this._dribblerSpeed}`);
			this._rotationSpeed = this._rotationSpeed + 0.1;
			this._finishedRound = false;
		} else if (robotRotation > (1 / 4) * Math.PI) {
			// enable listening for finished round
			this._finishedRound = true;
		}

		if ((World.Time - this._lastTime >= ROTATION_ACCELERATION_STEP_TIME) && this._curRotationSpeed < this._rotationSpeed) {
			this._curRotationSpeed += (this._rotationSpeed - this._curRotationSpeed) * this._acceleration;
			this._lastTime = World.Time;
		}
		if (this._curRotationSpeed > MAX_ROTATION_SPEED) {
			RotateWithBall._isFinished = true;
		}

		this._robot.setDribblerSpeed(this._dribblerSpeed);
		this._robot.trajectory.update(Direct, speed, undefined, this._curRotationSpeed);

	}
}
