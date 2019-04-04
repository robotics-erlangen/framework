import * as Constants from "base/constants";
import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import { FriendlyRobot } from "base/robot";
import { Position, RelativePosition, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { MessageBox, MessageType } from "glados/control/messaging";
import { Assignment, Move } from "glados/group/move/base";
import * as BallObserver from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import { PlaceBall } from "glados/task/attacker/placeball";
import { Halt } from "glados/task/shared/halt";
import { MoveToPos } from "glados/task/shared/movetopos";
import { Pass } from "glados/task/shared/pass";


const enum State {
	WAIT_FOR_BALL_STOP	= "WAIT_FOR_BALL_STOP",
	PULL_TO_FIELD		= "PULL_TO_FIELD",
	GET_INTO_POSITION	= "GET_INTO_POSITION",
	EXECUTE_PASS		= "EXECUTE_PASS",
	ACCEPT_PASS			= "ACCEPT_PASS",
	WAIT_FOR_SET_BACK	= "WAIT_FOR_SET_BACK",
	SET_BACK			= "SET_BACK",
	FINE_ADJUST			= "FINE_ADJUST",
	INVALID				= "INVALID",
}

// Tolerance according to the rules
const TOLERANCE = 0.1;

const ARRIVED_DISTANCE = 0.05;
const BALL_STOP_SPEED = 0.2;
const MAX_BALL_DISTANCE = 0.25;
const FINE_ADJUST_ZONE = 1.5;
const MAX_DRIBBLER_SPEED = 0.8;
const SETBACK_WAIT_TIME = 0.4;
const PASS_TARGET_SPEED = 1;

const SHOOTER_EVADING_POSITIONS = [
	new Vector(0.5 * World.Geometry.FieldWidthHalf, 0.5 * World.Geometry.FieldHeightHalf),
	new Vector(-0.5 * World.Geometry.FieldWidthHalf, 0.5 * World.Geometry.FieldHeightHalf),
	new Vector(0.5 * World.Geometry.FieldWidthHalf, -0.5 * World.Geometry.FieldHeightHalf),
	new Vector(-0.5 * World.Geometry.FieldWidthHalf, -0.5 * World.Geometry.FieldHeightHalf)
];

function estimateBallStopPosition(ball: Physics.BallLike): Position {
	let stopTime = Physics.ballStopTime(ball);
	return Physics.ballAtTime(ball, stopTime).pos;
}

export class BallPlacement extends Move {
	public static MIN_ROBOTS: number = 2;
	public static MAX_ROBOTS: number = 2;

	public static canStart(): boolean {
		return World.RefereeState === "BallPlacementOffensive";
	}

	public _canContinue(): boolean {
		return World.RefereeState === "BallPlacementOffensive";
	}

	private _state: State = State.WAIT_FOR_BALL_STOP;
	private _stateChanged: boolean = true;
	private _stateChangeTime: number = World.Time;

	private _ballStartPos: Position = World.Ball.pos;
	private _ballTeleportTime: number | undefined;

	private _ballReceiverIntersects: boolean = false;
	private _mainAttacker: FriendlyRobot;
	private _selectedEvadingPos: Position;

	private _receiverBallDirection: number | undefined;
	private _computedShooterPos: Position = new Vector(0, 0);
	private _computedReceiverPos: Position = new Vector(0, 0);

	private SHOOTER: FriendlyRobot;
	private RECEIVER: FriendlyRobot;

	private _ballPlacementPos: Readonly<Position>;


	constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
		this._ballPlacementPos = <Position> World.BallPlacementPos;
		this.SHOOTER = this._robots[0];
		this.RECEIVER = this._robots[1];
		this._determineRoles();
		this._determinePositions();
		this._mainAttacker = this.SHOOTER;
		this._selectedEvadingPos = SHOOTER_EVADING_POSITIONS[1];

	}

	_updateTasks(): [Map<FriendlyRobot, Assignment>, FriendlyRobot] {
		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		if (World.BallPlacementPos) {
			this._ballPlacementPos = World.BallPlacementPos;
		}

		const SHOOTER_OBSTACLES = [
			{
				type: "circle",
				x: World.Ball.pos.x,
				y: World.Ball.pos.y,
				radius: World.Ball.radius,
				name: "g/m/ballplacement Ball"
			},
			{
				type: "circle",
				x: this._ballPlacementPos.x,
				y: this._ballPlacementPos.y,
				radius: FINE_ADJUST_ZONE,
				name: "g/m/ballplacement Receiver Zone"
			}
		];


		let oldState = this._state;
		this._state = this._getNextState(this._state);
		this._stateChanged = this._state !== oldState;
		if (this._stateChanged) {
			this._stateChangeTime = World.Time;
		}

		debug.push("Ball Placement");
		debug.set("State", this._state);
		debug.pop();

		vis.addCircle("g/m/ballplacement", this._ballPlacementPos, TOLERANCE, vis.colors.red, true);
		vis.addCircle("g/m/ballplacement", this._ballPlacementPos, FINE_ADJUST_ZONE, vis.colors.orange);

		switch (this._state) {
			case State.WAIT_FOR_BALL_STOP: {
				this._determinePositions();
				taskAssignments[this.RECEIVER] = {
					class: MoveToPos,
					params: [ this._computedReceiverPos, undefined, undefined, undefined, undefined, undefined, true ],
					restart: true
				};
				taskAssignments[this.SHOOTER] = {
					class: MoveToPos,
					params: [ Field.limitToField(this._computedShooterPos), undefined, undefined, undefined, true, SHOOTER_OBSTACLES, true ],
					restart: true
				};

				break;
			}
			case State.PULL_TO_FIELD: {
				this._mainAttacker = this.SHOOTER;
				taskAssignments[this.RECEIVER] = {
					class: MoveToPos,
					params: [ this._computedReceiverPos, undefined, undefined, undefined, undefined, undefined, true ],
					restart: this._stateChanged
				};
				taskAssignments[this.SHOOTER] = {
					class: PlaceBall,
					params: [ Field.limitToField(World.Ball.pos, -TOLERANCE) ],
					restart: this._stateChanged
				};

				break;
			}
			case State.GET_INTO_POSITION: {
				this._mainAttacker = this.SHOOTER;
				this._determinePositions();
				taskAssignments[this.RECEIVER] = {
					class: MoveToPos,
					params: [ this._computedReceiverPos, undefined, undefined, undefined, undefined, undefined, true ],
					restart: true
				};
				taskAssignments[this.SHOOTER] = {
					class: MoveToPos,
					params: [ this._computedShooterPos, undefined, undefined, undefined, true, SHOOTER_OBSTACLES, true ],
					restart: true
				};

				break;
			}
			case State.EXECUTE_PASS: {
				this._mainAttacker = this.SHOOTER;

				taskAssignments[this.SHOOTER] = {
					class: Pass,
					params: [ this.RECEIVER, World.BallPlacementPos, false, undefined, undefined, PASS_TARGET_SPEED],
					restart: this._stateChanged
				};
				taskAssignments[this.RECEIVER] = {
					class: MoveToPos,
					params: [ this._computedReceiverPos, undefined, undefined, undefined, undefined, undefined, true ],
					restart: this._stateChanged
				};

				break;
			}
			case State.ACCEPT_PASS: {
				this._mainAttacker = this.RECEIVER;
				taskAssignments[this.SHOOTER] = { class: Halt, restart: this._stateChanged };

				this.RECEIVER.setDribblerSpeed(MAX_DRIBBLER_SPEED);

				let ballSpeed = World.Ball.speed;
				let [intersection, ballLambda] = geom.intersectLineLine(World.Ball.pos, ballSpeed, this.RECEIVER.pos, ballSpeed.perpendicular());
				this._ballReceiverIntersects = ballLambda != undefined && ballLambda > 0;

				// We don't want to receive a pass out of field because setback may not be possible there
				if (intersection == undefined || !Field.isInField(intersection)) {
					intersection = Field.nextLineCut(World.Ball.pos, ballSpeed) || World.Ball.pos;
				}

				vis.addPath("g/m/ballplacement", [ this.RECEIVER.pos, intersection, World.Ball.pos ], vis.colors.red);

				// Stop moving if the ball is near the receiver
				// We don't use halt because Halt could possibly stop the dribbler from spinning
				if (World.Ball.pos.distanceTo(this.RECEIVER.pos) < World.Ball.radius + this.RECEIVER.shootRadius + 0.1) {
					taskAssignments[this.RECEIVER] = {
						class: MoveToPos,
						params: [ this.RECEIVER.pos, this._receiverBallDirection, undefined, undefined, undefined, undefined, true, true ],
						restart: true
					};
				} else {
					this._receiverBallDirection = (World.Ball.pos - this.RECEIVER.pos).angle();
					taskAssignments[this.RECEIVER] = {
						class: MoveToPos,
						params: [ intersection, undefined, undefined, undefined, undefined, undefined, true ],
						restart: true
					};
				}

				break;
			}
			case State.WAIT_FOR_SET_BACK: {
				this._mainAttacker = this.RECEIVER;
				taskAssignments[this.SHOOTER] = { class: Halt, restart: this._stateChanged };
				taskAssignments[this.RECEIVER] = { class: Halt, restart: this._stateChanged };

				break;
			}
			case State.SET_BACK: {
				this._mainAttacker = this.RECEIVER;
				taskAssignments[this.SHOOTER] = { class: Halt, restart: this._stateChanged };
				if (this._stateChanged) {
					this._computedReceiverPos = this.RECEIVER.pos + (this.RECEIVER.pos - World.Ball.pos).setLength(2 * this.RECEIVER.radius);
				}
				taskAssignments[this.RECEIVER] = {
					class: MoveToPos,
					params: [ this._computedReceiverPos, undefined, undefined, undefined, undefined, undefined, true ],
					restart: this._stateChanged
				};

				break;
			}
			case State.FINE_ADJUST: {
				this._mainAttacker = this.RECEIVER;
				taskAssignments[this.RECEIVER] = {
					class: PlaceBall,
					restart: this._stateChanged
				};
				if (this._stateChanged) {
					// Simple sampling from some preselected positions
					// If no fitting position could be found (because the field is too small) the last used position is chosen as fallback
					for (let pos of SHOOTER_EVADING_POSITIONS) {
						if (pos.distanceTo(this._ballPlacementPos) > FINE_ADJUST_ZONE) {
							this._selectedEvadingPos = pos;
							break;
						}
					}
				}
				taskAssignments[this.SHOOTER] = {
					class: MoveToPos,
					params: [ this._selectedEvadingPos, undefined, undefined, undefined, undefined, SHOOTER_OBSTACLES, true],
					restart: this._stateChanged
				};

				break;
			}
		}

		if (taskAssignments[this.SHOOTER] == undefined) {
			throw new Error("SHOOTER has no task assigned in state="  +  this._state);
		}
		if (taskAssignments[this.RECEIVER] == undefined) {
			throw new Error("RECEIVER has not task assigned in state="  +  this._state);
		}
		return [taskAssignments, this._mainAttacker];
	}

	_getNextState(currentState: string): State {
		let nextState = State.INVALID;

		let usedBallPos = BallObserver.getRealisticBallPos();
		switch (currentState) {
			case State.WAIT_FOR_BALL_STOP: {
				nextState = State.WAIT_FOR_BALL_STOP;
				if (World.Ball.speed.length() < BALL_STOP_SPEED) {
					this._ballStartPos = usedBallPos;
					if (usedBallPos.distanceTo(this._ballPlacementPos) < FINE_ADJUST_ZONE) {
						nextState = State.FINE_ADJUST;
					} else if (!Field.isInField(usedBallPos)
							|| Field.isInFriendlyGoal(usedBallPos)
							|| Field.isInOpponentGoal(usedBallPos)) {
						nextState = State.PULL_TO_FIELD;
					} else {
						nextState = State.GET_INTO_POSITION;
					}
				}

				break;
			}
			case State.PULL_TO_FIELD: {
				nextState = State.PULL_TO_FIELD;
				if (Field.isInField(usedBallPos) &&
						!(Field.isInFriendlyGoal(usedBallPos) || Field.isInOpponentGoal(usedBallPos))
						&&  this.SHOOTER.pos.distanceTo(usedBallPos) > Constants.stopBallDistance / 3) {
					nextState = State.WAIT_FOR_BALL_STOP;
				}

				break;
			}
			case State.GET_INTO_POSITION: {
				nextState = State.GET_INTO_POSITION;
				if (World.Ball.speed.length() > BALL_STOP_SPEED
						||  usedBallPos.distanceTo(this._ballStartPos) > MAX_BALL_DISTANCE) {
					nextState = State.WAIT_FOR_BALL_STOP;
				} else if (this.SHOOTER.pos.distanceTo(this._computedShooterPos) < ARRIVED_DISTANCE
						&&  this.RECEIVER.pos.distanceTo(this._computedReceiverPos) < ARRIVED_DISTANCE) {
					nextState = State.EXECUTE_PASS;
				}

				break;
			}
			case State.EXECUTE_PASS: {
				nextState = State.EXECUTE_PASS;
				if (BallObserver.isShot()) {
					nextState = State.ACCEPT_PASS;
				} else if (usedBallPos.distanceTo(this._ballStartPos) > MAX_BALL_DISTANCE) {
					nextState = State.WAIT_FOR_BALL_STOP;
				}

				break;
			}
			case State.ACCEPT_PASS: {
				nextState = State.ACCEPT_PASS;
				let ballDist = World.Ball.pos.distanceTo(this.RECEIVER.pos);
				if (World.Ball.speed.length() < BALL_STOP_SPEED) {
					nextState = ballDist > MAX_BALL_DISTANCE ? State.WAIT_FOR_BALL_STOP : State.WAIT_FOR_SET_BACK;
				}
				if (!this._ballReceiverIntersects && ballDist > MAX_BALL_DISTANCE) {
					nextState = State.WAIT_FOR_BALL_STOP;
				}

				break;
			}
			case State.WAIT_FOR_SET_BACK: {
				nextState = State.WAIT_FOR_SET_BACK;
				if (World.Time - this._stateChangeTime > SETBACK_WAIT_TIME) {
					nextState = State.SET_BACK;
				}

				break;
			}
			case State.SET_BACK: {
				nextState = State.SET_BACK;
				if (this.RECEIVER.pos.distanceTo(this._computedReceiverPos) < ARRIVED_DISTANCE) {
					nextState = State.WAIT_FOR_BALL_STOP;
				}

				break;
			}
			case State.FINE_ADJUST: {
				nextState = State.FINE_ADJUST;
				if (usedBallPos.distanceTo(this._ballPlacementPos) > FINE_ADJUST_ZONE) {
					nextState = State.WAIT_FOR_BALL_STOP;
				}

				break;
			}
		}

		if (nextState === State.INVALID) {
			throw new Error(`nextState invalid, currentState=${currentState} is probably invalid`);
		}
		return nextState;
	}

	private _determineRoles() {
		let ballStopPos = estimateBallStopPosition(World.Ball);
		let oneBallDist = this._robots[0].pos.distanceToSq(ballStopPos);
		let twoBallDist = this._robots[1].pos.distanceToSq(ballStopPos);
		let onePlacementDist = this._robots[0].pos.distanceToSq(this._ballPlacementPos);
		let twoPlacementDist = this._robots[1].pos.distanceToSq(this._ballPlacementPos);

		let firstIsReceiver = oneBallDist < twoBallDist;
		if (ballStopPos.distanceTo(this._ballPlacementPos) > FINE_ADJUST_ZONE) {
			firstIsReceiver = Math.max(twoBallDist, onePlacementDist) < Math.max(oneBallDist, twoPlacementDist);
		}

		if (firstIsReceiver) {
			this.RECEIVER = this._robots[0];
			this.SHOOTER = this._robots[1];
		} else {
			this.RECEIVER = this._robots[1];
			this.SHOOTER = this._robots[0];
		}
	}

	private _determinePositions() {
		let offset = (World.Ball.pos - this._ballPlacementPos).setLength(this.RECEIVER.shootRadius + World.Ball.radius + 0.05);
		this._computedShooterPos = World.Ball.pos + offset;
		this._computedReceiverPos = this._ballPlacementPos - offset;
	}
}
