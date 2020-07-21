import { log } from "base/amun";
import { FriendlyRobot } from "base/robot";
import { Position, Speed, Vector } from "base/vector";
import * as World from "base/world";

import { MessageBox, MessageType } from "glados/control/messaging";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { MoveToPos } from "glados/task/shared/movetopos";
import { DribbleCircle } from "glados/test/task/dribbletest/dribblecircle"; // work in progress
import { GetBallContact } from "glados/test/task/dribbletest/getballcontact";
import { MoveSidewards } from "glados/test/task/dribbletest/movesidewards";
import { PullBall } from "glados/test/task/dribbletest/pullball";
import { RotateWithBall } from "glados/test/task/dribbletest/rotatewithball";

enum State {
	GET_BALL_CONTACT			= "GET_BALL_CONTACT",
	RUN_TEST_ROTATE_WITH_BALL	= "TEST_ROTATE_WITH_BALL",		// Test 1
	RUN_TEST_DRIBBLE_CIRCLE		= "TEST_DRIBBLE_CIRCLE",		// Test 2
	RUN_TEST_PULL_BALL			= "TEST_PULL_BALL",				// Test 3
	RUN_TEST_MOVE_SIDEWARDS		= "TEST_MOVE_SIDEWARDS",		// Test 4
	FINISHED					= "FINISHED",
}

/*
 * DESCRIPTION
 *
 * Each time the robot loses the ball, the running test will be restarted up to TEST_MAX_TRY_COUNTER times. Each time the test is restarted the speed of the dribbler * will be increased by DRIBBLER_SPEED_INCREASE
 *
 * TEST_TO_RUN:
 * Valid values: TEST_ROTATE_WITH_BALL, TEST_DRIBBLE_CIRCLE, TEST_PULL_BALL, TEST_MOVE_SIDEWARDS
 * Defines which test shall be executed.
 * When the test is finished, the next one will be started automatically.
 * Set to TEST_ROTATE_WITH_BALL to run all tests in a row.
 *
 * ACCELERATION:
 * Determines the robots acceleration during the tests.
 * Also affects the rotational acceleration for tests in which the robot rotates.
 * Should be set to a value between 0 and 1.
 * Does not affect the acceleration the robot uses while ensuring ball contact or placing the ball.
 *
 * INITIAL_MOVEMENT_SPEED, INITIAL_ROTATION_SPEED, INITIAL_DRIBBLER_SPEED:
 * Initial values ​​for the tests.
 * DribblerSpeed ​​is increased eacht time the robot loses the ball.
 * MovementSpeed ​​/ RotationSpeed ​​is increased when a test finishes successfuly.
 */
const TEST_MAX_TRY_COUNTER = 3;
const DRIBBLER_SPEED_INCREASE = 0.1;
const TEST_TO_RUN = State.RUN_TEST_ROTATE_WITH_BALL;  // RUN_TEST_DRIBBLE_CIRCLE noch nicht verwenden

const ACCELERATION = 0.1;
const INITIAL_MOVEMENT_SPEED = 0.2;
const INITIAL_ROTATION_SPEED = 0.2;
const INITIAL_DRIBBLER_SPEED = 0.5;

const CIRCLE_RADIUS = 1;
const CARPET_FRICTION = 1;
const BALL_MASS = 1;





export class DribbleTest extends Move {
	private static MIN_TIME_IN_STATE = 0.1;
	public static MIN_ROBOTS: number = 1;
	public static MAX_ROBOTS: number = 1;
	public static readonly ALLOW_EXTRA_ATTACKERS = false;


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
		DribbleCircle.resetInitialisation();
		PullBall.resetInitialisation();
		MoveSidewards.resetInitialisation();
	}


	public _updateTasks(): MoveParameters {
		let taskAssignments = new Map<FriendlyRobot, Assignment>();


		this._currentState = this._getNextState(this._currentState);
		let currentState = this._currentState;

		let defaultPos = new Vector(0, 0);
		let restart = false;
		switch (this._currentState) {
			case State.GET_BALL_CONTACT:
				restart = !GetBallContact.isInitialised();
				taskAssignments[this._robots[0]] = {class: GetBallContact, restart: restart, params: [this._dribblerSpeed]};
				break;
			case State.RUN_TEST_ROTATE_WITH_BALL:
				restart = !RotateWithBall.isInitialised();
				if (restart) {
					log(`Running ${currentState}`);
					log(`dribblerSpeed: ${this._dribblerSpeed}\tmovementSpeed: ${this._movementSpeed}\trotationSpeed: ${this._rotationSpeed}`);
				}
				taskAssignments[this._robots[0]] = {class: RotateWithBall, restart: restart, params: [this._rotationSpeed, this._dribblerSpeed, ACCELERATION]};

				break;
			case State.RUN_TEST_DRIBBLE_CIRCLE:
				restart = !DribbleCircle.isInitialised();
				if (restart) {
					log(`Running ${currentState}`);
					log(`dribblerSpeed: ${this._dribblerSpeed}\tmovementSpeed: ${this._movementSpeed}`);
				}
				taskAssignments[this._robots[0]] = {class: DribbleCircle, restart: restart, params: [this._movementSpeed, this._dribblerSpeed, ACCELERATION, CIRCLE_RADIUS, CARPET_FRICTION, BALL_MASS]};

				break;
			case State.RUN_TEST_PULL_BALL:
				restart = !PullBall.isInitialised();
				if (restart) {
					log(`Running ${currentState}`);
					log(`dribblerSpeed: ${this._dribblerSpeed}\tmovementSpeed: ${this._movementSpeed}`);
				}
				taskAssignments[this._robots[0]] = {class: PullBall, restart: restart, params: [this._movementSpeed, this._dribblerSpeed, ACCELERATION]};

				break;
			case State.RUN_TEST_MOVE_SIDEWARDS:
				restart = !MoveSidewards.isInitialised();
				if (restart) {
					log(`Running ${currentState}`);
					log(`dribblerSpeed: ${this._dribblerSpeed}\tmovementSpeed: ${this._movementSpeed}`);
				}
				taskAssignments[this._robots[0]] = {class: MoveSidewards, restart: restart, params: [this._movementSpeed, this._dribblerSpeed, ACCELERATION]};

				break;
			case State.FINISHED:
				// log("FINISHED");
				taskAssignments[this._robots[0]] = {class: MoveToPos, params: [{ pos: defaultPos, dir: 0 }]};

				break;
			default:
				taskAssignments[this._robots[0]] = {class: MoveToPos, params: [{ pos: defaultPos, dir: 0 }]};

				break;
		}


		return {assignments: taskAssignments};
	}

	private _getNextState(currentState: State): State {
		if (World.Time - this._stateChangeTime < DribbleTest.MIN_TIME_IN_STATE) {
			return currentState;
		}

		if (this._robots[0].pos.distanceTo(World.Ball.pos) > this._offset + 0.01 && World.Ball.isPositionValid()) {
			if (currentState === State.FINISHED) {
				return State.FINISHED;
			}

			if (currentState === State.GET_BALL_CONTACT) {
				if (World.Ball.pos.distanceTo(GetBallContact.getTargetPos()) < 0.01) {
					return currentState;
				}
			} else {
				log(`Lost Ball while running: ${this._currentState}`);
				this._ballLossCounter += 1;
			}

			if (this._ballLossCounter >= TEST_MAX_TRY_COUNTER) {// || this._dribblerSpeed > 1) {
				this._ballLossCounter = 0;
				this._movementSpeed = INITIAL_MOVEMENT_SPEED;
				this._rotationSpeed = INITIAL_ROTATION_SPEED;
				this._dribblerSpeed = INITIAL_DRIBBLER_SPEED;
				log(`Lost ball too often. Stopping: ${currentState}`);
				switch (currentState) {
					case State.RUN_TEST_ROTATE_WITH_BALL:
						RotateWithBall.setFinished();
						this._testToRun = State.RUN_TEST_PULL_BALL; // TODO adjust once TEST_DRIBBLE_CIRCLE is finished
						break;
					case State.RUN_TEST_DRIBBLE_CIRCLE:
						DribbleCircle.setFinished();
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
					case State.RUN_TEST_DRIBBLE_CIRCLE:
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

		switch (currentState) {
			case State.GET_BALL_CONTACT:
				newState = State.GET_BALL_CONTACT;

				if (GetBallContact._isDone()) {
					newState = this._testToRun;
					// log("Starting: " + newState);
				}
				break;
			case State.RUN_TEST_ROTATE_WITH_BALL:
				newState = State.RUN_TEST_ROTATE_WITH_BALL;

				if (RotateWithBall.isFinished()) {
					this._testToRun = State.RUN_TEST_DRIBBLE_CIRCLE;
					newState = this._testToRun;
					// log("Starting: " + newState);
				}
				break;
			case State.RUN_TEST_DRIBBLE_CIRCLE:
				newState = State.RUN_TEST_DRIBBLE_CIRCLE;

				if (DribbleCircle.isFinished()) {
					this._testToRun = State.RUN_TEST_PULL_BALL;
					newState = this._testToRun;
				}
				break;
			case State.RUN_TEST_PULL_BALL:
				newState = State.RUN_TEST_PULL_BALL;

				if (PullBall.isFinished()) {
					this._testToRun = State.RUN_TEST_MOVE_SIDEWARDS;
					newState = this._testToRun;
					// log("Starting: " + newState);
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
