 import { log } from "base/amun";
 import * as World from "base/world";
 import { Agent, Task } from "glados/task/base";
 
 import * as PathHelper from "glados/trajectory/pathhelper";
 import { ToTarget } from "glados/trajectory/totarget";
 
 import { Vector, Position, Speed } from "base/vector";
 
 export class MoveSidewards extends Task {
	 private static _isFinished: boolean = false;
	 private static _isInitialised: boolean = false;
	 
	 
	 private _initialMovementSpeed : number;
	 private _movementSpeed : number;
	 private _dribblerSpeed : number;
	 
	 private _prevBallPos : Position = new Vector(0, 0);
	 
	 private _curTarget : number = 1;
	 private _topTarget : Position = new Vector(0, 0);
	 private _botTarget : Position = new Vector(0, 0);
	 private _startFlagg : boolean = false;
	 
	 
	 
	 
	 private _tryCatchBallCounter : number = 0;
	 private readonly _tryCatchBallMAX : number = 100;
	 
	 constructor(agent: Agent, movementSpeed: number, dribblerSpeed: number) {
		 super(agent);
		 this._initialMovementSpeed = movementSpeed;
		 this._movementSpeed = this._initialMovementSpeed;
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
		 
		 let ownPosition: Position = this._robot.pos;
		 let ballPos : Position = World.Ball.pos;
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
			 
			 this._robot.trajectory.update(ToTarget, targetPosition, (1/2)*Math.PI, 0.1, undefined);
			 
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
				 this._robot.trajectory.update(ToTarget, this._topTarget, (1/2)*Math.PI, this._movementSpeed, undefined);
			 } else {
				 this._robot.trajectory.update(ToTarget, this._botTarget, (1/2)*Math.PI, this._movementSpeed, undefined);
			 }
		 }
		 
		 
		 /*if (this._robot.pos.distanceTo(ballPos) < (offset + 0.01)) {
		  *             if (this._startFlagg == false) {
		  *                 let targetPosition : Position = new Vector(0, this._prevBallPos.y);
		  *                 this._robot.setDribblerSpeed(1);
		  *                 
		  *                 
		  *                 if (this._robot.pos.distanceTo(targetPosition) < 0.01) {
		  *                     this._startFlagg = true;
		  *                     this._topTarget = new Vector(1, this._prevBallPos.y);
		  *                     this._botTarget = new Vector(-1, this._prevBallPos.y);
	 }
	 
	 this._robot.trajectory.update(ToTarget, targetPosition, (1/2)*Math.PI, 0.1, undefined);
	 
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
		 this._robot.trajectory.update(ToTarget, this._topTarget, (1/2)*Math.PI, this._movementSpeed, undefined);
	 } else {
		 this._robot.trajectory.update(ToTarget, this._botTarget, (1/2)*Math.PI, this._movementSpeed, undefined);
	 }
	 }
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
				 MoveSidewards._isFinished = true;
				 log("PullBall is finished!");
	 }
	 }
	 this._tryCatchBallCounter++;
	 this._prevBallPos = World.Ball.pos;
	 this._prevBallPos.y += 0.01;
	 this._robot.trajectory.update(ToTarget, this._prevBallPos, angle, 0.1, undefined);
	 }*/
	 }
 }
 
 
