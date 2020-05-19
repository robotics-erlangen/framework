import { log } from "base/amun";
import { Position, Speed, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { Agent, Task } from "glados/task/base";
import { Direct } from "glados/trajectory/direct";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";


const ROTATION_STEP_TIME = 0.2;


export class DribbleCircle extends Task {
	private static _isFinished: boolean = false;
	private static _isInitialised: boolean = false;

	private _startPos : Position;

	private _movementSpeed : number;
	private _dribblerSpeed : number;
	private _acceleration : number;
	private _radius : number;
	private _carpetFriction : number;
	private _ballMass : number;


	private _speed : Speed;

	private _lastTime : number = World.Time;

	private _finishedRound : boolean = true;


	constructor(agent: Agent, movementSpeed: number, dribblerSpeed: number, acceleration: number, radius: number, carpetFriction: number, ballMass: number) {
		super(agent);

		this._movementSpeed = movementSpeed;
		this._dribblerSpeed = dribblerSpeed;
		this._acceleration = acceleration;
		this._radius = 0.5;
		this._carpetFriction = carpetFriction;
		this._ballMass = ballMass;

		this._speed = new Vector(0, this._movementSpeed);

		this._startPos = this._robot.pos.copy();


		DribbleCircle._isInitialised = true;
	}

	public static isFinished(): boolean {
		return DribbleCircle._isFinished;
	}
	public static setFinished() {
		DribbleCircle._isFinished = true;
	}
	public static isInitialised(): boolean {
		return DribbleCircle._isInitialised;
	}
	public static resetInitialisation() {
		DribbleCircle._isInitialised = false;
	}

	public run() {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, { ignorePass: true, ignoreBall: true, ignoreDefenseArea: true, ignoreOpponentDefenseArea: true });

		if (World.Time - this._lastTime >= ROTATION_STEP_TIME) {
			this._speed = this._speed.rotated(Math.PI / 16);
			this._lastTime = World.Time;
		}

		let angle = (World.Ball.pos - this._robot.pos).angle();
		this._speed = this._speed.rotated((World.Time % 1000) % (Math.PI * 2));

		this._robot.setDribblerSpeed(1);
		this._robot.trajectory.update(Direct, this._speed, this._speed.angle());
		/*let angle = ((1/this._radius)*(World.Time) % 1000) % (Math.PI * 2);
		vis.addCircle("TESTVIS", this._startPos, this._radius);
		let pos = this._startPos + Vector.fromPolar(angle, this._radius);
		let dir = pos.angle();

		this._robot.trajectory.update(ToTarget, pos, angle + Math.PI/2, 1);*/

	}
}
