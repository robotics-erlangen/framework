//glados/task/attacker/placeball.ts
//glados/group/move/ballplacement.ts

import { log } from "base/amun";
import * as World from "base/world";
import { FriendlyRobot } from "base/robot";
import { Vector, Position, Speed } from "base/vector";

import { MessageBox, MessageType } from "glados/control/messaging";

import { Move, Assignment } from "glados/group/move/base";

import { MoveToPos } from "glados/task/shared/movetopos";

import { GetBallContact } from "glados/test/task/dribbletest/getballcontact";
//Test Tasks
import { RotateWithBall } from "glados/test/task/dribbletest/rotatewithball";
import { PullBall } from "glados/test/task/dribbletest/pullball";
import { MoveSidewards } from "glados/test/task/dribbletest/movesidewards";


enum State {
    GET_BALL_CONTACT 			= "GET_BALL_CONTACT",
    RUN_TEST_ROTATE_WITH_BALL 	= "TEST_ROTATE_WITH_BALL",
    RUN_TEST_PULL_BALL 			= "TEST_PULL_BALL",
    RUN_TEST_MOVE_SIDEWARDS 	= "TEST_MOVE_SIDEWARDS",
    FINISHED					= "FINISHED",
}

const MIN_TIME_IN_STATE = 0.1;

const TEST_MAX_TRY_COUNTER = 3;

const INITIAL_MOVEMENT_SPEED = 0.2;
const INITIAL_ROTATION_SPEED = 0.5;
const INITIAL_DRIBBLER_SPEED = 0.5;


export class DribbleTest extends Move {
    //Anzahl Roboter fuer diesen Move
    public static MIN_ROBOTS: number = 1;
    public static MAX_ROBOTS: number = 1;
    
    
    private _currentState = State.GET_BALL_CONTACT;
    private _stateChangend = false;
    private _stateChangeTime = World.Time;
    private _testToRun: State = State.RUN_TEST_ROTATE_WITH_BALL;
    
    private _movementSpeed : number = INITIAL_MOVEMENT_SPEED;
    private _rotationSpeed : number = INITIAL_ROTATION_SPEED;
    private _dribblerSpeed : number = INITIAL_DRIBBLER_SPEED;
    
    private _ballLossCounter : number = 0;
    
    private _offset: number = this._robots[0].shootRadius + World.Ball.radius;
    
    private _false : boolean = false;
    
    
    
    constructor(robots: FriendlyRobot[], messaging: MessageBox) {
        super(robots, messaging);
    }
    
    public static canStart() {
        return true;
    }
    
    public _canContinue() {
        return true;
    }
    
    private resetInitialisation() {
        GetBallContact.resetInitialisation();
        RotateWithBall.resetInitialisation();
        PullBall.resetInitialisation();
        MoveSidewards.resetInitialisation();
    }
    
    
    public _updateTasks(): [Map<FriendlyRobot, Assignment>, undefined] {
        let taskAssignments = new Map<FriendlyRobot, Assignment>();
        
        
        let offset = this._robots[0].shootRadius + World.Ball.radius;
        
        this._currentState = this._getNextState(this._currentState);
        let currentState = this._currentState;
        
        let defaultPos = new Vector(0, 0);
        switch(this._currentState) {
            case State.GET_BALL_CONTACT:
                if (!GetBallContact.isInitialised()) {
                    taskAssignments[this._robots[0]] = {class: GetBallContact, restart: true};
                } else {
                    taskAssignments[this._robots[0]] = {class: GetBallContact };
                }
                break;
            case State.RUN_TEST_ROTATE_WITH_BALL:
                if (!RotateWithBall.isInitialised()) {
                    log("Running " + currentState);
                    log("dribblerSpeed: " + this._dribblerSpeed + " movementSpeed: " + this._movementSpeed + " rotationSpeed: " + this._rotationSpeed);
                    taskAssignments[this._robots[0]] = {class: RotateWithBall, restart: true, params: [this._rotationSpeed, this._dribblerSpeed]};
                } else {
                    taskAssignments[this._robots[0]] = {class: RotateWithBall };
                }
                break;
            case State.RUN_TEST_PULL_BALL:
                if (!PullBall.isInitialised()) {
                    log("Running " + currentState);
                    log("dribblerSpeed: " + this._dribblerSpeed + " movementSpeed: " + this._movementSpeed + " rotationSpeed: " + this._rotationSpeed);
                    taskAssignments[this._robots[0]] = {class: PullBall, restart: true, params: [this._movementSpeed, this._dribblerSpeed]};
                } else {
                    taskAssignments[this._robots[0]] = {class: PullBall };
                }
                break;
            case State.RUN_TEST_MOVE_SIDEWARDS:
                if (!MoveSidewards.isInitialised()) {
                    log("Running " + currentState);
                    log("dribblerSpeed: " + this._dribblerSpeed + " movementSpeed: " + this._movementSpeed + " rotationSpeed: " + this._rotationSpeed);
                    taskAssignments[this._robots[0]] = {class: MoveSidewards, restart: true, params: [this._movementSpeed, this._dribblerSpeed]};
                } else {
                    taskAssignments[this._robots[0]] = {class: MoveSidewards};
                }
                break;
            case State.FINISHED:
                //log("test finished");
                taskAssignments[this._robots[0]] = {class: MoveToPos, params: [defaultPos, 0]};
                break;
            default:
                taskAssignments[this._robots[0]] = {class: MoveToPos, params: [defaultPos, 0]};
                break;
        }
        
        
        return [taskAssignments, undefined];
    }
    
    private _getNextState(currentState: State): State {
        if (World.Time - this._stateChangeTime < MIN_TIME_IN_STATE) {
            return currentState;
        }
        
        //wenn Abstand zu Ball zu groß ist, stelle Ballkontakt wieder her
        //erhoehe DribblerSpeed und starte aktuellen Test bis zu TEST_MAX_TRY_COUNTER Mal neu
        //wurde aktueller test schon TEST_MAX_TRY_COUNTER Mal gestartet, gehe zu naechstem Test
        if (this._robots[0].pos.distanceTo(World.Ball.pos) > this._offset + 0.1) {
            if (currentState == State.FINISHED) {
                return State.FINISHED;
            }
            
            if (currentState != State.GET_BALL_CONTACT) {
                log("Lost Ball while running: " + this._currentState);
                this._ballLossCounter += 1;
            }
            
            if (this._ballLossCounter >= TEST_MAX_TRY_COUNTER) {
                this._ballLossCounter = 0;
                this._movementSpeed = INITIAL_MOVEMENT_SPEED;
                this._rotationSpeed = INITIAL_ROTATION_SPEED;
                this._dribblerSpeed = INITIAL_DRIBBLER_SPEED;
                log("Lost ball too often. Stopping: " + currentState);
                switch(currentState) {
                    case State.RUN_TEST_ROTATE_WITH_BALL:
                        RotateWithBall.setFinished();
                        this._testToRun = State.RUN_TEST_PULL_BALL;
                        break;
                    case State.RUN_TEST_PULL_BALL:
                        PullBall.setFinished();
                        this._testToRun = State.RUN_TEST_MOVE_SIDEWARDS;
                        break;
                    case State.RUN_TEST_MOVE_SIDEWARDS:
                        MoveSidewards.setFinished();
                        this._testToRun = State.FINISHED;
                        break;
                    default:
                        break;
                }
                
            } else {
                switch (currentState) {
                    case State.RUN_TEST_ROTATE_WITH_BALL:
                        this._dribblerSpeed += 0.1;
                        break;
                    case State.RUN_TEST_PULL_BALL:
                        this._dribblerSpeed += 0.1;
                        break;
                    case State.RUN_TEST_MOVE_SIDEWARDS:
                        this._dribblerSpeed += 0.1;
                        break;
                    default:
                        break;
                }
            }
            
            this.resetInitialisation();
            return State.GET_BALL_CONTACT;
        }
        
        let newState = currentState;
        
        switch(currentState) {
            case State.GET_BALL_CONTACT:
                newState = State.GET_BALL_CONTACT;
                
                if (GetBallContact._isDone()) {
                    newState = this._testToRun;
                    //log("Starting: " + newState);
                }
                break;
            case State.RUN_TEST_ROTATE_WITH_BALL:
                newState = State.RUN_TEST_ROTATE_WITH_BALL;
                
                if (RotateWithBall.isFinished()) {
                    this._testToRun = State.RUN_TEST_PULL_BALL;
                    newState = this._testToRun;
                    //log("Starting: " + newState);
                }
                break;
            case State.RUN_TEST_PULL_BALL:
                newState = State.RUN_TEST_PULL_BALL;
                
                if (PullBall.isFinished()) {
                    this._testToRun = State.RUN_TEST_MOVE_SIDEWARDS;
                    newState = this._testToRun;
                    //log("Starting: " + newState);
                }
                break;
            case State.RUN_TEST_MOVE_SIDEWARDS:
                newState = State.RUN_TEST_MOVE_SIDEWARDS;
                
                if (MoveSidewards.isFinished()) {
                    newState = State.FINISHED;
                    log("FINISHED");
                }
                break;
            default:
                break;
        }
        return newState;
    }
    
}



// 	private moveToBall() {
// 		let taskAssignments = new Map<FriendlyRobot, Assignment>();
// 		
// 		let ownPosition: Position = this._robots[0].pos;
// 		let targetPosition : Position = World.Ball.pos;
// 		targetPosition.y = targetPosition.y + this._robots[0].shootRadius;
// 		let angle : number = (targetPosition - ownPosition).angle();
// 		let angle : number = Math.PI/2;
// 		
// 		if (this._robots[0].pos.distanceTo(World.Ball.pos) < 0.01) {//offset + 0.01) {
// 			taskAssignments[this._robots[0]] = {class: GetBallContact, restart: true, params: []};
// 		} else {
// 			taskAssignments[this._robots[0]] = {class: MoveToPos, restart: true, params: [targetPosition, angle, false, undefined, undefined, undefined, undefined, true]};
// 		}
// 		
// 		return taskAssignments;
// 	}


//if (!this._robots[0].hasBall(World.Ball)) {
// 		let offset : number = World.Ball.radius + this._robots[0].shootRadius;
// 		if (this._robots[0].pos.distanceTo(World.Ball.pos) > offset + 0.01) {
// 			this.resetInitialisation();
// 			log("lost the ball");
// 			return [this.moveToBall(), undefined];
// 		}


// if (!this._robots[0].hasBall(World.Ball)) {
// 				let offset : number = World.Ball.radius + this._robots[0].shootRadius;
// 				if (this._robots[0].pos.distanceTo(World.Ball.pos) > offset + 0.01) {
// 					this.resetInitialisation();
// 					log("lost the ball");
// 					taskAssignments = this.moveToBall();
// 					return [this.moveToBall(), undefined];
// 				}
// 				
// 				if (this._startTest || true) {
// 					run the first task that is no yet finished
// 					if (this._false && !RotateWithBall.isFinished()) {
// 						if task is avoked the first time, give necessary parameters
// 						else run this task till it reports finished
// 						if (!RotateWithBall.isInitialised()) {
// 							taskAssignments[this._robots[0]] = {class: RotateWithBall, restart: true, params: [rotationSpeed, dribblerSpeed]};
// 						} else {
// 							taskAssignments[this._robots[0]] = {class: RotateWithBall };
// 						}
// 					} else if (!PullBall.isFinished()) {
// 						
// 						if (!PullBall.isInitialised()) {
// 							taskAssignments[this._robots[0]] = {class: PullBall, restart: true, params: [movementSpeed, dribblerSpeed]};
// 						} else {
// 							taskAssignments[this._robots[0]] = {class: PullBall };
// 						}
// 					} else if (!MoveSidewards.isFinished()) {
// 						
// 						if (!MoveSidewards.isInitialised()) {
// 							taskAssignments[this._robots[0]] = {class: MoveSidewards, restart: true, params: [movementSpeed, dribblerSpeed]};
// 						} else {
// 							taskAssignments[this._robots[0]] = {class: MoveSidewards};
// 						}
// 					} else {
// 						log("test finished");
// 						let pos = new Vector(0, 0);
// 						taskAssignments[this._robots[0]] = {class: MoveToPos, params: [pos, 0, Infinity, undefined]};
// 					}
// 				}
// 				break;
// 			default:
// 				break;
// 		}
//Move to ball before starting any of the test tasks
// 		if (this._moveToBall == true) {
// 		 *            if (this._firstStart) {
// 		 *                let targetPosition : Position = World.Ball.pos;
// 		 *                let ownPosition: Position = this._robots[0].pos;
// 		 *                let angle : number = (targetPosition - ownPosition).angle();
// 		 *                
// 		 *                taskAssignments[this._robots[0]] = {class: MoveToPos, restart: true, params: [targetPosition, angle, Infinity, undefined]};
// 		 *                this._firstStart = false;
// 	} else {
// 		taskAssignments[this._robots[0]] = {class: MoveToPos };
// 		
// 		if (this._robots[0].pos.distanceTo(this._ballPosition) <= (this._robots[0].radius + World.Ball.radius + 0.004)) {
// 			this._moveToBall = false;
// 			this._startTest = true;
// 	}
// 	}
// 	}

//run the first task that is no yet finished
// 		if (this._false && !RotateWithBall.isFinished()) {
// 			if task is avoked the first time, give necessary parameters
// 			else run this task till it reports finished
// 			if (!RotateWithBall.isInitialised()) {
// 				taskAssignments[this._robots[0]] = {class: RotateWithBall, restart: true, params: [rotationSpeed, dribblerSpeed]};
// 			} else {
// 				taskAssignments[this._robots[0]] = {class: RotateWithBall };
// 			}
// 		} else if (!PullBall.isFinished()) {
// 			
// 			if (!PullBall.isInitialised()) {
// 				taskAssignments[this._robots[0]] = {class: PullBall, restart: true, params: [movementSpeed, dribblerSpeed]};
// 			} else {
// 				taskAssignments[this._robots[0]] = {class: PullBall };
// 			}
// 		} else if (!MoveSidewards.isFinished()) {
// 			
// 			if (!MoveSidewards.isInitialised()) {
// 				taskAssignments[this._robots[0]] = {class: MoveSidewards, restart: true, params: [movementSpeed, dribblerSpeed]};
// 			} else {
// 				taskAssignments[this._robots[0]] = {class: MoveSidewards};
// 			}
// 		} else {
// 			log("test finished");
// 			let pos = new Vector(0, 0);
// 			taskAssignments[this._robots[0]] = {class: MoveToPos, params: [pos, 0, Infinity, undefined]};
// 		}
