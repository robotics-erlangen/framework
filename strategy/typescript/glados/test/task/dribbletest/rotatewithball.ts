import { log } from "base/amun";
import * as World from "base/world";
import { Agent, Task } from "glados/task/base";

import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";
import { Direct } from "glados/trajectory/direct";

import { Vector, Position, Speed } from "base/vector";


export class RotateWithBall extends Task {
	private static _isFinished: boolean = false;
	private static _isInitialised: boolean = false;
	
	
	private _initialRotationSpeed : number;
	private _rotationSpeed : number;
	private _dribblerSpeed : number;
	
	private _finishedRound : boolean = true;
	
	
	constructor(agent: Agent, rotationSpeed: number, dribblerSpeed: number) {
		super(agent);
		
		this._initialRotationSpeed = rotationSpeed;
		this._rotationSpeed = rotationSpeed;
		this._dribblerSpeed = dribblerSpeed;
		
		RotateWithBall._isInitialised = true;
	}
	
	public static isFinished():boolean{
		return RotateWithBall._isFinished;
	}
	public static setFinished(){
        RotateWithBall._isFinished = true;
    }
	public static isInitialised():boolean{
		return RotateWithBall._isInitialised;
	}
	public static resetInitialisation() {
		RotateWithBall._isInitialised = false;
	}
	
	public run(){
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, { ignorePass: true, ignoreBall: true });
		
		let targetPosition : Position = World.Ball.pos.copy();
		let ownPosition: Position = this._robot.pos;
		let offset = this._robot.shootRadius + World.Ball.radius;
		let speed : Speed = new Vector(0, 0);
		
		let angle : number = (targetPosition - ownPosition).angle();
		let robotRotation : number = this._robot.dir;
		
		
		if (robotRotation > ((7/8) * Math.PI) && this._finishedRound){
			//finished one rotation; increase rotation speed
            log("SuccessRotate; RotationSpeed: " + this._rotationSpeed + "\tDribblerSpeed: " + this._dribblerSpeed);
			this._rotationSpeed = this._rotationSpeed + 0.1;
			//log("increased rotation speed: "+this._rotationSpeed+" dribbler speed: "+this._dribblerSpeed);
			this._finishedRound = false;
		} else if (robotRotation < ((7/8) * Math.PI)) {
			//enable listening for finished round
			this._finishedRound = true;
		}
		
		
		this._robot.setDribblerSpeed(this._dribblerSpeed);
		this._robot.trajectory.update(Direct, speed, undefined, this._rotationSpeed);
		
	}
}
