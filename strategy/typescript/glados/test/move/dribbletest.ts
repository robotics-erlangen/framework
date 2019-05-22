import { log } from "base/amun";
import * as World from "base/world";
import { FriendlyRobot } from "base/robot";
import { Vector, Position, Speed } from "base/vector";

import { MessageBox, MessageType } from "glados/control/messaging";

import { Move, Assignment } from "glados/group/move/base";

import { MoveToPos } from "glados/task/shared/movetopos";

import { GetBallContact } from "glados/test/task/dribbletest/getballcontact";
import { RotateWithBall } from "glados/test/task/dribbletest/rotatewithball";
import { PullBall } from "glados/test/task/dribbletest/pullball";
import { MoveSidewards } from "glados/test/task/dribbletest/movesidewards";

enum State {
	GET_BALL_CONTACT			= "GET_BALL_CONTACT",
	RUN_TEST_ROTATE_WITH_BALL	= "TEST_ROTATE_WITH_BALL",		//TEST 1
	RUN_TEST_PULL_BALL			= "TEST_PULL_BALL",				//TEST 2
	RUN_TEST_MOVE_SIDEWARDS		= "TEST_MOVE_SIDEWARDS",		//TEST 3
	FINISHED					= "FINISHED",
}

/*
 * BESCHREIBUNG:
 * 
 * Verliert der Roboter den Ball, so wird der laufende Test TEST_MAX_TRY_COUNTER mal neugestartet. Bei jedem Neustart wird die Dribblergeschwindigkeit um 
 * DRIBBLER_SPEED_INCREASE erhoeht
 * 
 * TEST_TO_RUN:
 * kann auf einen der Tests aus State gesetzt werden (TEST_ROTATE_WITH_BALL, TEST_PULL_BALL, TEST_MOVE_SIDEWARDS)
 * Ist der Test fertig, wird automatisch der nachfolgende ausgefuehrt.
 * auf TEST_ROTATE_WITH_BALL setzen, um alle drei Tests hintereinander auszufuehren
 * 
 * ACCELERATION:
 * bestimmt die Beschleunigung des Roboters bei den Tests.
 * Wirkt sich auch auf die Beschleunigung beim drehen aus.
 * Sollte auf einen Wert zwischen 0 und 1 gesetzt werden
 * Wirkt sich nich auf die Beschleunigung der Bewegungen aus, mit denen der Roboter den Ball platziert
 * 
 * INITIAL_MOVEMENT_SPEED, INITIAL_ROTATION_SPEED, INITIAL_DRIBBLER_SPEED:
 * Die Anfangswerte fuer die Tests. 
 * DribblerSpeed wird erhoeht, wenn der Roboter den Ball verliert
 * MovementSpeed/RotationSpeed wird erhoeht, wenn ein Testdurchlauf erfolgreich war
 */
const TEST_MAX_TRY_COUNTER = 3;
const DRIBBLER_SPEED_INCREASE = 0.1;
const TEST_TO_RUN = State.RUN_TEST_ROTATE_WITH_BALL;

const ACCELERATION = 0.1;
const INITIAL_MOVEMENT_SPEED = 0.2;
const INITIAL_ROTATION_SPEED = 0.5;
const INITIAL_DRIBBLER_SPEED = 0.5;




const MIN_TIME_IN_STATE = 0.1; //ignore

export class DribbleTest extends Move {
	public static MIN_ROBOTS: number = 1;
	public static MAX_ROBOTS: number = 1;
	
	
	private _currentState = State.GET_BALL_CONTACT;
	private _stateChangeTime = World.Time;
	private _testToRun: State = TEST_TO_RUN;
	
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
		
		
		this._currentState = this._getNextState(this._currentState);
		let currentState = this._currentState;
		
		let defaultPos = new Vector(0, 0);
		switch(this._currentState) {
			case State.GET_BALL_CONTACT:
				if (!GetBallContact.isInitialised()) {
					taskAssignments[this._robots[0]] = {class: GetBallContact, restart: true, params: [this._dribblerSpeed]};
				} else {
					taskAssignments[this._robots[0]] = {class: GetBallContact };
				}
				
				break;
			case State.RUN_TEST_ROTATE_WITH_BALL:
				if (!RotateWithBall.isInitialised()) {
					log("Running " + currentState);
					log("dribblerSpeed: " + this._dribblerSpeed + "\tmovementSpeed: " + this._movementSpeed + "\trotationSpeed: " + this._rotationSpeed);
					taskAssignments[this._robots[0]] = {class: RotateWithBall, restart: true, params: [this._rotationSpeed, this._dribblerSpeed, ACCELERATION]};
				} else {
					taskAssignments[this._robots[0]] = {class: RotateWithBall };
				}
				
				break;
			case State.RUN_TEST_PULL_BALL:
				if (!PullBall.isInitialised()) {
					log("Running " + currentState);
					log("dribblerSpeed: " + this._dribblerSpeed + "\tmovementSpeed: " + this._movementSpeed + "\trotationSpeed: " + this._rotationSpeed);
					taskAssignments[this._robots[0]] = {class: PullBall, restart: true, params: [this._movementSpeed, this._dribblerSpeed, ACCELERATION]};
				} else {
					taskAssignments[this._robots[0]] = {class: PullBall };
				}
				
				break;
			case State.RUN_TEST_MOVE_SIDEWARDS:
				if (!MoveSidewards.isInitialised()) {
					log("Running " + currentState);
					log("dribblerSpeed: " + this._dribblerSpeed + "\tmovementSpeed: " + this._movementSpeed + "\trotationSpeed: " + this._rotationSpeed);
					taskAssignments[this._robots[0]] = {class: MoveSidewards, restart: true, params: [this._movementSpeed, this._dribblerSpeed, ACCELERATION]};
				} else {
					taskAssignments[this._robots[0]] = {class: MoveSidewards};
				}
				
				break;
			case State.FINISHED:
				//log("FINISHED");
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
		
		if (this._robots[0].pos.distanceTo(World.Ball.pos) > this._offset + 0.01 && World.Ball.isPositionValid()) {
			if (currentState == State.FINISHED) {
				return State.FINISHED;
			}
			
			if (currentState == State.GET_BALL_CONTACT) {
				if (World.Ball.pos.distanceTo(GetBallContact.getTargetPos()) < 0.01) {
					return currentState;
				}
			} else {
				log("Lost Ball while running: " + this._currentState);
				this._ballLossCounter += 1;
			}
			
			if (this._ballLossCounter >= TEST_MAX_TRY_COUNTER) {//|| this._dribblerSpeed > 1) {
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
						this._dribblerSpeed += DRIBBLER_SPEED_INCREASE;
						break;
					case State.RUN_TEST_PULL_BALL:
						this._dribblerSpeed += DRIBBLER_SPEED_INCREASE;
						break;
					case State.RUN_TEST_MOVE_SIDEWARDS:
						this._dribblerSpeed += DRIBBLER_SPEED_INCREASE;
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
