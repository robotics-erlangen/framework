import * as Constants from "base/constants";
import * as debug from "base/debug";
import {FriendlyRobot} from "base/robot";
import * as Field from "base/field";
import {Vector, Position, RelativePosition} from "base/vector";
import * as geom from "base/geom";
import * as vis from "base/vis";
import * as World from "base/world";

import {MessageBox, MessageType} from "glados/control/messaging";
import {Move, Assignment} from "glados/group/move/base";
import * as BallObserver from "glados/observer/ball"
import {Halt} from "glados/task/shared/halt"
import {MoveToPos} from "glados/task/shared/movetopos";
import * as Physics from "glados/observer/physics";
import {Pass} from "glados/task/shared/pass";
import {PlaceBall} from "glados/task/attacker/placeball"


let STATE_WAIT_FOR_BALL_STOP = "STATE_WAIT_FOR_BALL_STOP";
let STATE_PULL_TO_FIELD = "STATE_PULL_TO_FIELD";
let STATE_GET_INTO_POSITION = "STATE_GET_INTO_POSITION";
let STATE_EXECUTE_PASS = "STATE_EXECUTE_PASS";
let STATE_ACCEPT_PASS = "STATE_ACCEPT_PASS";
let STATE_WAIT_FOR_SET_BACK = "STATE_WAIT_FOR_SET_BACK";
let STATE_SET_BACK = "STATE_SET_BACK";
let STATE_FINE_ADJUST = "STATE_FINE_ADJUST";

// Tolerance according to the rules
let TOLERANCE = 0.1;


let ARRIVED_DISTANCE = 0.05;
let BALL_STOP_SPEED = 0.2;
let MAX_BALL_DISTANCE = 0.25;
let FINE_ADJUST_ZONE = 1.5;
let MAX_DRIBBLER_SPEED = 0.8;
let SETBACK_WAIT_TIME = 0.4;
let PASS_TARGET_SPEED = 1;

let SHOOTER_EVADING_POSITIONS = [
	new Vector(0.5 * World.Geometry.FieldWidthHalf, 0.5 * World.Geometry.FieldHeightHalf),
	new Vector(-0.5 * World.Geometry.FieldWidthHalf, 0.5 * World.Geometry.FieldHeightHalf),
	new Vector(0.5 * World.Geometry.FieldWidthHalf, -0.5 * World.Geometry.FieldHeightHalf),
	new Vector(-0.5 * World.Geometry.FieldWidthHalf, -0.5 * World.Geometry.FieldHeightHalf)
];

function estimateBallStopPosition (ball: Physics.BallLike): Position {
	let stopTime = Physics.ballStopTime(ball);
	return Physics.ballAtTime(ball, stopTime).pos;
}

export class FastBallPlacement extends Move {
	public static MIN_ROBOTS: number = 2;
	public static MAX_ROBOTS: number = 2;

	public static canStart (): boolean {
		return World.RefereeState === "BallPlacementOffensive"
	}

	public _canContinue (): boolean {
		return World.RefereeState === "BallPlacementOffensive"
	}

	private _state: string = STATE_WAIT_FOR_BALL_STOP;
	private _stateChanged: boolean = true
	private _stateChangeTime: number = World.Time

	private _ballStartPos: Position = World.Ball.pos
	private _ballTeleportTime: number | undefined;

	private _ballReceiverIntersects: boolean = false
	private _mainAttacker: FriendlyRobot;
	private _selectedEvadingPos: Position;

	private _receiverBallDirection: number | undefined;
	private _computedShooterPos: Position = new Vector(0, 0);
	private _computedReceiverPos: Position = new Vector(0, 0);

	private SHOOTER: FriendlyRobot;
	private RECEIVER: FriendlyRobot;

	private _ballPlacementPos: Readonly<Position>;
	

	constructor (robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
		this.SHOOTER = this._robots[0];
		this.RECEIVER = this._robots[1];
		this._determineRoles()
		this._determinePositions()
		this._mainAttacker = this.SHOOTER
		this._selectedEvadingPos = SHOOTER_EVADING_POSITIONS[1]

		this._ballPlacementPos = <Position>World.BallPlacementPos;
	}

	_updateTasks (): [Map<FriendlyRobot, Assignment>, FriendlyRobot] {
		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		let SHOOTER_OBSTACLES = [
			{
				type: "circle",
				x: World.Ball.pos.x,
				y: World.Ball.pos.y,
				radius: World.Ball.radius,
				name: "g/m/fastballplacement Ball"
			},
			{
				type: "circle",
				x: this._ballPlacementPos.x,
				y: this._ballPlacementPos.y,
				radius: FINE_ADJUST_ZONE,
				name: "g/m/fastballplacement Receiver Zone"
			}
		];


		let oldState = this._state
		this._state = this._getNextState(this._state)
		this._stateChanged = this._state != oldState
		if (this._stateChanged) {
			this._stateChangeTime = World.Time
		}

		debug.push("Ball Placement")
		debug.set("State", this._state)
		debug.pop()

		vis.addCircle("g/m/fastballplacement", this._ballPlacementPos, TOLERANCE, vis.colors.red, true)
		vis.addCircle("g/m/fastballplacement", this._ballPlacementPos, FINE_ADJUST_ZONE, vis.colors.orange)

		if (this._state == STATE_WAIT_FOR_BALL_STOP) {
			this._determinePositions()
			taskAssignments[this.RECEIVER] = {
				class: MoveToPos,
				params: [ this._computedReceiverPos, undefined, undefined, undefined, undefined, undefined, true ],
				restart: true
			}
			taskAssignments[this.SHOOTER] = {
				class: MoveToPos,
				params: [ Field.limitToField(this._computedShooterPos), undefined, undefined, undefined, true, SHOOTER_OBSTACLES, true ],
				restart: true
			}
		} else if (this._state == STATE_PULL_TO_FIELD) {
			this._mainAttacker = this.SHOOTER
			taskAssignments[this.RECEIVER] = {
				class: MoveToPos,
				params: [ this._computedReceiverPos, undefined, undefined, undefined, undefined, undefined, true ],
				restart: this._stateChanged
			}
			taskAssignments[this.SHOOTER] = {
				class: PlaceBall,
				params: [ Field.limitToField(World.Ball.pos, -TOLERANCE) ],
				restart: this._stateChanged
			}
		} else if (this._state == STATE_GET_INTO_POSITION) {
			this._mainAttacker = this.SHOOTER
			this._determinePositions()
			taskAssignments[this.RECEIVER] = {
				class: MoveToPos,
				params: [ this._computedReceiverPos, undefined, undefined, undefined, undefined, undefined, true ],
				restart: true
			}
			taskAssignments[this.SHOOTER] = {
				class: MoveToPos,
				params: [ this._computedShooterPos, undefined, undefined, undefined, true, SHOOTER_OBSTACLES, true ],
				restart: true
			}
		} else if (this._state == STATE_EXECUTE_PASS) {
			this._mainAttacker = this.SHOOTER

			taskAssignments[this.SHOOTER] = {
				class: Pass,
				params: [ this.RECEIVER, World.BallPlacementPos, false, undefined, undefined, PASS_TARGET_SPEED],
				restart: this._stateChanged
			}
			taskAssignments[this.RECEIVER] = {
				class: MoveToPos,
				params: [ this._computedReceiverPos, undefined, undefined, undefined, undefined, undefined, true ],
				restart: this._stateChanged
			}
		} else if (this._state == STATE_ACCEPT_PASS) {
			this._mainAttacker = this.RECEIVER
			taskAssignments[this.SHOOTER] = { class: Halt, restart: this._stateChanged }

			this.RECEIVER.setDribblerSpeed(MAX_DRIBBLER_SPEED)

			let ballSpeed = World.Ball.speed
			let [intersection, ballLambda] = geom.intersectLineLine(World.Ball.pos, ballSpeed, this.RECEIVER.pos, ballSpeed.perpendicular());
			this._ballReceiverIntersects = ballLambda > 0

			// We don't want to receive a pass out of field because setback may not be possible there
			if (!Field.isInField(intersection)) {
				intersection = Field.nextLineCut(World.Ball.pos, ballSpeed) || World.Ball.pos
			}

			vis.addPath("g/m/fastballplacement", [ this.RECEIVER.pos, intersection, World.Ball.pos ], vis.colors.red)

			// Stop moving if the ball is near the receiver
			// We don't use halt because Halt could possibly stop the dribbler from spinning
			if (World.Ball.pos.distanceTo(this.RECEIVER.pos) < World.Ball.radius + this.RECEIVER.shootRadius + 0.1) {
				taskAssignments[this.RECEIVER] = {
					class: MoveToPos,
					params: [ this.RECEIVER.pos, this._receiverBallDirection, undefined, undefined, undefined, undefined, true, true ],
					restart: true
				}
			} else {
				this._receiverBallDirection = (World.Ball.pos - this.RECEIVER.pos).angle()
				taskAssignments[this.RECEIVER] = {
	            class: MoveToPos,
	            params: [ intersection, undefined, undefined, undefined, undefined, undefined, true ],
	            restart: true
	        }
			}
		} else if (this._state == STATE_WAIT_FOR_SET_BACK) {
			this._mainAttacker = this.RECEIVER
			taskAssignments[this.SHOOTER] = { class: Halt, restart: this._stateChanged }
			taskAssignments[this.RECEIVER] = { class: Halt, restart: this._stateChanged }
		} else if (this._state == STATE_SET_BACK) {
			this._mainAttacker = this.RECEIVER
			taskAssignments[this.SHOOTER] = { class: Halt, restart: this._stateChanged }
			if (this._stateChanged) {
				this._computedReceiverPos = this.RECEIVER.pos + (this.RECEIVER.pos - World.Ball.pos).setLength(2 * this.RECEIVER.radius)
			}
			taskAssignments[this.RECEIVER] = {
				class: MoveToPos,
				params: [ this._computedReceiverPos, undefined, undefined, undefined, undefined, undefined, true ],
				restart: this._stateChanged
			}
		} else if (this._state == STATE_FINE_ADJUST) {
			this._mainAttacker = this.RECEIVER
			taskAssignments[this.RECEIVER] = {
				class: PlaceBall,
				restart: this._stateChanged
			}
			if (this._stateChanged) {
				// Simple sampling from some preselected positions
				// If no fitting position could be found (because the field is too small) the last used position is chosen as fallback
				for (let pos of SHOOTER_EVADING_POSITIONS) {
					if (pos.distanceTo(this._ballPlacementPos) > FINE_ADJUST_ZONE) {
						this._selectedEvadingPos = pos
						break
					}
				}
			}
			taskAssignments[this.SHOOTER] = {
				class: MoveToPos,
				params: [ this._selectedEvadingPos, undefined, undefined, undefined, undefined, SHOOTER_OBSTACLES, true],
				restart: this._stateChanged
			}
		}

		if (taskAssignments[this.SHOOTER] == undefined) {
			throw new Error("SHOOTER has no task assigned in state="  +  this._state)
		}
		if (taskAssignments[this.RECEIVER] == undefined) {
			throw new Error("RECEIVER has not task assigned in state="  +  this._state)
		}
		return [taskAssignments, this._mainAttacker];
	}

	_getNextState (currentState: string): string {
		let nextState

		let usedBallPos = BallObserver.getRealisticBallPos()
		if (currentState == STATE_WAIT_FOR_BALL_STOP) {
			nextState = STATE_WAIT_FOR_BALL_STOP
			if (World.Ball.speed.length() < BALL_STOP_SPEED) {
				this._ballStartPos = usedBallPos
				if (usedBallPos.distanceTo(this._ballPlacementPos) < FINE_ADJUST_ZONE) {
					nextState = STATE_FINE_ADJUST
				} else if (!Field.isInField(usedBallPos)
	                    || Field.isInFriendlyGoal(usedBallPos)
	                    || Field.isInOpponentGoal(usedBallPos)) {
					nextState = STATE_PULL_TO_FIELD
				} else {
					nextState = STATE_GET_INTO_POSITION
				}
			}
		} else if (currentState == STATE_PULL_TO_FIELD) {
			nextState = STATE_PULL_TO_FIELD
			if (Field.isInField(usedBallPos) &&
					!(Field.isInFriendlyGoal(usedBallPos) || Field.isInOpponentGoal(usedBallPos))
					 &&  this.SHOOTER.pos.distanceTo(usedBallPos) > Constants.stopBallDistance / 3) {
				nextState = STATE_WAIT_FOR_BALL_STOP
			}
		} else if (currentState == STATE_GET_INTO_POSITION) {
			nextState = STATE_GET_INTO_POSITION
			if (World.Ball.speed.length() > BALL_STOP_SPEED
					 ||  usedBallPos.distanceTo(this._ballStartPos) > MAX_BALL_DISTANCE) {
				nextState = STATE_WAIT_FOR_BALL_STOP
			} else if (this.SHOOTER.pos.distanceTo(this._computedShooterPos) < ARRIVED_DISTANCE
					 &&  this.RECEIVER.pos.distanceTo(this._computedReceiverPos) < ARRIVED_DISTANCE) {
				nextState = STATE_EXECUTE_PASS
			}
		} else if (currentState == STATE_EXECUTE_PASS) {
			nextState = STATE_EXECUTE_PASS
			if (BallObserver.isShot()) {
				nextState = STATE_ACCEPT_PASS
			} else if (usedBallPos.distanceTo(this._ballStartPos) > MAX_BALL_DISTANCE) {
				nextState = STATE_WAIT_FOR_BALL_STOP
			}
		} else if (currentState == STATE_ACCEPT_PASS) {
			nextState = STATE_ACCEPT_PASS
			let ballDist = World.Ball.pos.distanceTo(this.RECEIVER.pos)
			if (World.Ball.speed.length() < BALL_STOP_SPEED) {
				nextState = ballDist > MAX_BALL_DISTANCE ? STATE_WAIT_FOR_BALL_STOP : STATE_WAIT_FOR_SET_BACK
			}
			if (!this._ballReceiverIntersects && ballDist > MAX_BALL_DISTANCE) {
				nextState = STATE_WAIT_FOR_BALL_STOP
			}
		} else if (currentState == STATE_WAIT_FOR_SET_BACK) {
			nextState = STATE_WAIT_FOR_SET_BACK
			if (World.Time - this._stateChangeTime > SETBACK_WAIT_TIME) {
				nextState = STATE_SET_BACK
			}
		} else if (currentState == STATE_SET_BACK) {
			nextState = STATE_SET_BACK
			if (this.RECEIVER.pos.distanceTo(this._computedReceiverPos) < ARRIVED_DISTANCE) {
				nextState = STATE_WAIT_FOR_BALL_STOP
			}
		} else if (currentState == STATE_FINE_ADJUST) {
			nextState = STATE_FINE_ADJUST
			if (usedBallPos.distanceTo(this._ballPlacementPos) > FINE_ADJUST_ZONE) {
				nextState = STATE_WAIT_FOR_BALL_STOP
			}
		}

		if (nextState == undefined) {
			throw new Error("nextState not set, currentState="  +  currentState  +  " is probably invalid")
		}
		return nextState
	}

	

	private _determineRoles () {
		let ballStopPos = estimateBallStopPosition(World.Ball)
		let oneBallDist = this._robots[0].pos.distanceToSq(ballStopPos)
		let twoBallDist = this._robots[1].pos.distanceToSq(ballStopPos)
		let onePlacementDist = this._robots[0].pos.distanceToSq(this._ballPlacementPos)
		let twoPlacementDist = this._robots[1].pos.distanceToSq(this._ballPlacementPos)

		let firstIsReceiver = oneBallDist < twoBallDist
		if (ballStopPos.distanceTo(this._ballPlacementPos) > FINE_ADJUST_ZONE) {
			firstIsReceiver = Math.max(twoBallDist, onePlacementDist) < Math.max(oneBallDist, twoPlacementDist)
		}

		if (firstIsReceiver) {
			this.RECEIVER = this._robots[0]
			this.SHOOTER = this._robots[1]
		} else {
			this.RECEIVER = this._robots[1]
			this.SHOOTER = this._robots[0]
		}
	}

	private _determinePositions () {
		let offset = (World.Ball.pos - this._ballPlacementPos).setLength(this.RECEIVER.shootRadius + World.Ball.radius + 0.05)
		this._computedShooterPos = World.Ball.pos + offset
		this._computedReceiverPos = this._ballPlacementPos - offset
	}
}