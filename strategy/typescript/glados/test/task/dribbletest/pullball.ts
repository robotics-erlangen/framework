import { log } from "base/amun";
import * as World from "base/world";
import { Agent, Task } from "glados/task/base";

import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";

import { Vector, Position, Speed } from "base/vector";

export class PullBall extends Task {
	private static _isFinished: boolean = false;
	private static _isInitialised: boolean = false;
	
	private _allowNewAngle: boolean = true;
	private _angle: number = 0;
	
	
	private _initialMovementSpeed : number;
	private _movementSpeed : number;
	private _dribblerSpeed : number;
	
	private _startPos : Position;
	private _Target : Position;
	
	
	
	
	private _tryCatchBallCounter : number = 0;
	private readonly _tryCatchBallMAX : number = 100;
	
	constructor(agent: Agent, movementSpeed: number, dribblerSpeed: number) {
		super(agent);
		this._initialMovementSpeed = movementSpeed;
		this._movementSpeed = this._initialMovementSpeed;
		this._dribblerSpeed = dribblerSpeed;
		
		PullBall._isInitialised = true;
		
		let ownPosition: Position = this._robot.pos;
		let ballPos : Position = World.Ball.pos;
		this._Target = ((ballPos - ownPosition).normalize() * -1);
		this._startPos = ownPosition;
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
		
		
		/*let ownPosition: Position = this._robot.pos;
		 *        let ballPos : Position = World.Ball.pos;
		 *        let targetPosition : Position = ((ballPos - ownPosition).normalize() * -1);  //.rotate((1/4)*Math.PI);
		 *        targetPosition = new Vector(ballPos.x, -3);
		 *        
		 *        
		 *        let offset = this._robot.shootRadius + World.Ball.radius;
		 *        let angle : number = (ballPos - ownPosition).angle();
		 *        angle = Math.PI/2;
		 *        if (this._allowNewAngle) {
		 *            this._angle = angle;
		 *            //this._allowNewAngle = false;
	}*/
		
		if (this._robot.pos.y <= this._Target.y) {
			//Ball wieder zurückplatzieren auf startPos und MovementSpeed erhöhen
			//TODO
			PullBall._isFinished = true;
		}
		
		this._robot.setDribblerSpeed(this._dribblerSpeed);
		this._robot.trajectory.update(ToTarget, this._Target, (1/2)*Math.PI, this._movementSpeed, undefined);
		
		//if (this._robot.pos.distanceTo(ballPos) < offset) {
		/*if (this._robot.pos.distanceTo(ballPos) < (offset + 0.01)) {
		 *            this._robot.setDribblerSpeed(this._dribblerSpeed);
		 *            this._robot.trajectory.update(ToTarget, targetPosition, (1/2)*Math.PI, this._movementSpeed, undefined);
	} else {
		//robot distance to ball was greater or equal than defined offset (maximum allowed distance between robot and ball)
		log("lost the ball! movementSpeed: "+ this._movementSpeed+"; dribblerSpeed: "+this._dribblerSpeed);
		//if robot couldn't catch the ball with current dribblerSpeed and allready tried a few times, increase the dribblerSpeed
		if (this._tryCatchBallCounter == this._tryCatchBallMAX) {
			this._tryCatchBallCounter = 0;
			this._dribblerSpeed += 0.1;
			log("lost ball too often! increasing dribblerSpeed to: "+this._dribblerSpeed);
			this._movementSpeed = this._initialMovementSpeed;
			if (this._dribblerSpeed >= 1) {
				PullBall._isFinished = true;
				log("PullBall is finished!");
	}
	}
	this._tryCatchBallCounter++;
	this._robot.trajectory.update(ToTarget, ballPos, angle, 0.1, undefined);
	}*/
	}
}
