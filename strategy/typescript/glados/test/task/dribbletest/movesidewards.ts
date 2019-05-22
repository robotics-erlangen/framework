 import { log } from "base/amun";
 import * as World from "base/world";
 import { Agent, Task } from "glados/task/base";
 
 import * as PathHelper from "glados/trajectory/pathhelper";
 import { ToTarget } from "glados/trajectory/totarget";
 
 import { Vector, Position, Speed } from "base/vector";
 
 
 enum State {
    GO_TO_X0    = "GO_TO_X0",
    GO_TOP  = "GO_TOP",
    GO_BOT  = "GO_BOT",
    FINISHED            = "FINISHED",
}

const MAX_MOVEMENT_SPEED = 3.5;

const PULL_DRIBBLER_SPEED = 0.8;
const PULL_MOVEMENT_SPEED = 0.2;
 
 export class MoveSidewards extends Task {
	 private static _isFinished: boolean = false;
	 private static _isInitialised: boolean = false;
     
     
     private _currentState: State = State.GO_TO_X0;
	 
	 
	 private _movementSpeed : number;
	 private _dribblerSpeed : number;
	 
	 /*private _prevBallPos : Position = new Vector(0, 0);
	 
	 private _curTarget : number = 1;
	 private _topTarget : Position = new Vector(0, 0);
	 private _botTarget : Position = new Vector(0, 0);
	 private _startFlagg : boolean = false;*/
	 
	 
	 constructor(agent: Agent, movementSpeed: number, dribblerSpeed: number) {
		 super(agent);
		 this._movementSpeed = movementSpeed;
		 this._dribblerSpeed = dribblerSpeed;
		 
		 MoveSidewards._isInitialised = true;
	 }
	 
	 public static isFinished():boolean{
		 return MoveSidewards._isFinished;
	 }
	 public static setFinished(){
        MoveSidewards._isFinished = true;
    }
	 public static isInitialised():boolean{
		 return MoveSidewards._isInitialised;
	 }
	 public static resetInitialisation() {
		 MoveSidewards._isInitialised = false;
	 }
	 
	 public run() {
        PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, { ignorePass: true, ignoreBall: true });
         
         
        let currentState = this._currentState;
        this._currentState = this._getNextState(currentState);
         
        switch (currentState) {
            case State.GO_TO_X0:
                let x0target = new Vector(0, -4);
                this._robot.setDribblerSpeed(PULL_DRIBBLER_SPEED);
                this._robot.trajectory.update(ToTarget, x0target, (1/2)*Math.PI, PULL_MOVEMENT_SPEED);
                
                break;
                
            case State.GO_TOP:
                let topTarget = new Vector(1, this._robot.pos.y);
                this._robot.setDribblerSpeed(this._dribblerSpeed);
                this._robot.trajectory.update(ToTarget, topTarget, (1/2)*Math.PI, this._movementSpeed, undefined, 0.1);
                
                break;
                
            case State.GO_BOT:
                let botTarget = new Vector(-1, this._robot.pos.y);
                this._robot.setDribblerSpeed(this._dribblerSpeed);
                this._robot.trajectory.update(ToTarget, botTarget, (1/2)*Math.PI, this._movementSpeed, undefined, 0.1);
                
                break;
                
            case State.FINISHED:
                MoveSidewards._isFinished = true;
                break;
            default:
                break;
        }
		 
		 /*let ownPosition: Position = this._robot.pos.copy();
		 let ballPos : Position = World.Ball.pos.copy();
		 if (this._prevBallPos.x == 0) {
			 this._prevBallPos = ballPos;
		 }
		 let targetPosition : Position = new Vector(ballPos.x, 1);
		 let offset = this._robot.shootRadius + World.Ball.radius;
		 let angle : number = Math.PI/2;
		 
		 
		 
		 if (this._startFlagg == false) {
			 let targetPosition : Position = new Vector(0, this._prevBallPos.y);
			 this._robot.setDribblerSpeed(1);
			 
			 
			 if (this._robot.pos.distanceTo(targetPosition) < 0.01) {
				 this._startFlagg = true;
				 this._topTarget = new Vector(1, this._prevBallPos.y);
				 this._botTarget = new Vector(-1, this._prevBallPos.y);
			 }
			 
			 this._robot.trajectory.update(ToTarget, targetPosition, (1/2)*Math.PI, 0.1);
			 
		 } else {
			 if (this._robot.pos.distanceTo(this._topTarget) < 0.01 && this._curTarget == 1) {
				 this._curTarget = 0;
				 this._movementSpeed += 0.1;
			 } else if (this._robot.pos.distanceTo(this._botTarget) < 0.01 && this._curTarget == 0) {
				 this._curTarget = 1;
				 this._movementSpeed += 0.1;
			 }
			 
			 this._robot.setDribblerSpeed(this._dribblerSpeed);
			 if (this._curTarget == 1) {
				 this._robot.trajectory.update(ToTarget, this._topTarget, (1/2)*Math.PI, this._movementSpeed);
			 } else {
				 this._robot.trajectory.update(ToTarget, this._botTarget, (1/2)*Math.PI, this._movementSpeed);
			 }
		 }*/
	 }
	 
	 private _getNextState(currentState: State): State {
		let nextState: State;
        
        switch (currentState) {
            case State.GO_TO_X0:
                nextState = State.GO_TO_X0;
                
                if (Math.abs(this._robot.pos.x) < 0.05 && this._robot.pos.y < -3.95) {
                    nextState = State.GO_TOP;
                }
                
                break;
                
            case State.GO_TOP:
                nextState = State.GO_TOP;
                
                if (this._robot.pos.x > 0.95) {
                    log("SuccessMoveSide; MovementSpeed: " + this._movementSpeed + "\tDribblerSpeed: " + this._dribblerSpeed);
                    this._movementSpeed += 0.1;
                    nextState = State.GO_BOT;
                }
                
                break;
                
            case State.GO_BOT:
                nextState = State.GO_BOT;
                
                if (this._robot.pos.x < -0.95) {
                    log("SuccessMoveSide; MovementSpeed: " + this._movementSpeed + "\tDribblerSpeed: " + this._dribblerSpeed);
                    this._movementSpeed += 0.1;
                    nextState = State.GO_TOP;
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
 
 
