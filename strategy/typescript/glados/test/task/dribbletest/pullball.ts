import { log } from "base/amun";
import * as World from "base/world";
import { Agent, Task } from "glados/task/base";

import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";

import { Vector, Position, Speed } from "base/vector";


const MAX_MOVEMENT_SPEED = 3.5;

export class PullBall extends Task {
	private static _isFinished: boolean = false;
	private static _isInitialised: boolean = false;
	
	private _initialMovementSpeed : number;
	private _movementSpeed : number;
	private _dribblerSpeed : number;
	
	private _startPos : Position;
	private _Target : Position;
    
    private _curTarget : Position;
    private _curMovementSpeed : number;
	
    
	constructor(agent: Agent, movementSpeed: number, dribblerSpeed: number) {
		super(agent);
		this._initialMovementSpeed = movementSpeed;
		this._movementSpeed = this._initialMovementSpeed;
		this._dribblerSpeed = dribblerSpeed;
		
		PullBall._isInitialised = true;
		
        this._Target = this._robot.pos.copy();
        this._Target.y = this._Target.y - 1;
        
        this._curTarget = this._Target;
        this._curMovementSpeed = this._movementSpeed;
        
		this._startPos = this._robot.pos.copy();
	}
	
	public static isFinished():boolean{
		return PullBall._isFinished;
	}
	public static setFinished(){
        PullBall._isFinished = true;
    }
	public static isInitialised():boolean{
		return PullBall._isInitialised;
	}
	public static resetInitialisation() {
		PullBall._isInitialised = false;
	}
	
	public run() {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, { ignorePass: true, ignoreBall: true });
        
        
		if (this._robot.pos.distanceTo(this._curTarget) <= 0.01) {
			//Ball wieder zurückplatzieren auf startPos und MovementSpeed erhöhen
            switch (this._curTarget) {
                case this._startPos:
                    this._curTarget = this._Target;
                    this._movementSpeed += 0.1;
                    this._curMovementSpeed = this._movementSpeed;
                    break;
                case this._Target:
                    this._curTarget = this._startPos;
                    log("SuccessPull; MovementSpeed: " + this._movementSpeed + "\tDribblerSpeed: " + this._dribblerSpeed);
                    this._curMovementSpeed = 0.1;
                    break;
            }
            
            
            // wenn move Speed max erreicht, abbrechen
			if (this._movementSpeed > MAX_MOVEMENT_SPEED) {
                PullBall._isFinished = true;
            }
		}
		
		this._robot.setDribblerSpeed(this._dribblerSpeed);
		this._robot.trajectory.update(ToTarget, this._curTarget, (1/2)*Math.PI, this._curMovementSpeed, undefined, 0.1);
	}
}
