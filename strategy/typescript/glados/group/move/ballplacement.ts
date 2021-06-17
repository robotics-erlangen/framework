import * as Constants from "base/constants";
import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { MessageBox } from "glados/control/messaging";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import * as BallObserver from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import { PlaceBall } from "glados/task/attacker/placeball";
import { Wallkick } from "glados/task/attacker/wallkick";
import { Halt } from "glados/task/shared/halt";
import { MoveToPos, Obstacle } from "glados/task/shared/movetopos";
import { Pass } from "glados/task/shared/pass";


const enum State {
	WAIT_FOR_BALL_STOP = "WAIT_FOR_BALL_STOP",
	PULL_TO_FIELD = "PULL_TO_FIELD",
	GET_INTO_POSITION = "GET_INTO_POSITION",
	EXECUTE_PASS = "EXECUTE_PASS",
	ACCEPT_PASS = "ACCEPT_PASS",
	WAIT_FOR_SET_BACK = "WAIT_FOR_SET_BACK",
	FINE_ADJUST = "FINE_ADJUST",
	INVALID = "INVALID",
	SET_BACK_INVISIBLE = "SET_BACK_INVISIBLE",
	WALLKICK = "WALLKICK"
}

// Tolerance according to the rules
const TOLERANCE = 0.1;

const ARRIVED_DISTANCE = 0.25;
const BALL_STOP_SPEED = 0.2;
const MAX_BALL_DISTANCE = 0.25;
const FINE_ADJUST_ZONE = 1.5;
const MAX_DRIBBLER_SPEED = 0.8;
const SETBACK_WAIT_TIME = 1.2;
const PASS_TARGET_SPEED = 1;
const SET_BACK_MIN_WAIT_TIME = 0.5;
const SET_BACK_INVISIBLE_LENGTH = 0.1;

const MIN_BOUNDARY_DIST = 0.09;
const BOUNDARY_WIDTH = World.Geometry.BoundaryWidth;
const MIN_GOAL_LINE_DIST = 0.03;

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
	public static ALLOW_EXTRA_ATTACKERS = true;

	public static canStart(): boolean {
		return World.RefereeState === "BallPlacementOffensive";
	}

	public _canContinue(): boolean {
		return World.RefereeState === "BallPlacementOffensive";
	}

	private _state: State = State.WAIT_FOR_BALL_STOP;
	private _stateChanged: boolean = true;
	private _stateChangeTime: number = World.Time;

	private _ballStartPos: Position = BallObserver.getRealisticBallPos();
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

	private invisible: boolean = false;
	private forceSetBackInvisible: boolean = false;
	private setBackPosInvisible: Position = new Vector(0,0);

	private _wallKickTryTime: number | undefined = undefined;
	private _firstPosWallkick: Vector = new Vector(0,0);

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

	_updateTasks(): MoveParameters {
		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		if (World.BallPlacementPos) {
			this._ballPlacementPos = World.BallPlacementPos;
		}

		const SHOOTER_OBSTACLES: Obstacle[] = [
			{
				type: "circle",
				x: BallObserver.getRealisticBallPos().x,
				y: BallObserver.getRealisticBallPos().y,
				radius: 3 * World.Ball.radius,
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

		debug.set("Ball Placement", this._state);

		vis.addCircle("g/m/ballplacement", this._ballPlacementPos, TOLERANCE, vis.colors.red, true);
		vis.addCircle("g/m/ballplacement", this._ballPlacementPos, FINE_ADJUST_ZONE, vis.colors.orange);

		switch (this._state) {
			case State.WAIT_FOR_BALL_STOP: {
				let extraDistance = 0.05 + (Math.min(0.4, World.Ball.speed.length()) - BALL_STOP_SPEED);
				this._determinePositions(extraDistance);
				taskAssignments[this.RECEIVER] = Assignment.create({
					class: MoveToPos,
					params: [{ pos: this._computedReceiverPos, ignoreBallPlacement: true }],
					restart: true
				});
				taskAssignments[this.SHOOTER] = Assignment.create({
					class: MoveToPos,
					params: [{
						pos: Field.limitToField(this._computedShooterPos, -0.15),
						ignoreDefaultObstacles: true,
						customObstacles: SHOOTER_OBSTACLES,
						ignoreBallPlacement: true
					}],
					restart: true
				});

				break;
			}
			case State.PULL_TO_FIELD: {
				this._mainAttacker = this.SHOOTER;
				taskAssignments[this.RECEIVER] = Assignment.create({
					class: MoveToPos,
					params: [{ pos: this._computedReceiverPos, ignoreBallPlacement: true }],
					restart: this._stateChanged
				});
				taskAssignments[this.SHOOTER] = Assignment.create({
					class: PlaceBall,
					params: [ Field.limitToField(BallObserver.getRealisticBallPos(), -TOLERANCE) ],
					restart: this._stateChanged
				});

				break;
			}
			case State.GET_INTO_POSITION: {
				this._mainAttacker = this.SHOOTER;
				this._determinePositions(0.15);
				taskAssignments[this.RECEIVER] = Assignment.create({
					class: MoveToPos,
					params: [{ pos: this._computedReceiverPos, ignoreBallPlacement: true }],
					restart: true
				});
				taskAssignments[this.SHOOTER] = Assignment.create({
					class: MoveToPos,
					params: [{
						pos: this._computedShooterPos,
						ignoreDefaultObstacles: true,
						ignoreBallPlacement: true,
					}],
					restart: true
				});

				break;
			}
			case State.EXECUTE_PASS: {
				this._mainAttacker = this.SHOOTER;

				taskAssignments[this.SHOOTER] = Assignment.create({
					class: Pass,
					params: [ this.RECEIVER, World.BallPlacementPos, false, undefined, undefined, PASS_TARGET_SPEED],
					restart: this._stateChanged
				});
				taskAssignments[this.RECEIVER] = Assignment.create({
					class: MoveToPos,
					params: [{ pos: this._computedReceiverPos, ignoreBallPlacement: true }],
					restart: this._stateChanged
				});

				break;
			}
			case State.ACCEPT_PASS: {
				this._mainAttacker = this.RECEIVER;
				if (this._stateChanged) {
					this._calculateEvadingPos();
				}
				taskAssignments[this.SHOOTER] = Assignment.create({ class: MoveToPos, params: [{ pos: this._selectedEvadingPos }] });

				this.RECEIVER.setDribblerSpeed(MAX_DRIBBLER_SPEED);

				let ballSpeed = World.Ball.speed;
				let [intersection, ballLambda] = geom.intersectLineLine(BallObserver.getRealisticBallPos(), ballSpeed, this.RECEIVER.pos, ballSpeed.perpendicular());
				this._ballReceiverIntersects = ballLambda != undefined && ballLambda > 0;

				// We don't want to receive a pass out of field because setback may not be possible there
				if (intersection == undefined || !Field.isInField(intersection)) {
					intersection = Field.nextLineCut(BallObserver.getRealisticBallPos(), ballSpeed) || BallObserver.getRealisticBallPos();
				}

				vis.addPath("g/m/ballplacement", [ this.RECEIVER.pos, intersection, BallObserver.getRealisticBallPos() ], vis.colors.red);

				// Stop moving if the ball is near the receiver
				// We don't use halt because Halt could possibly stop the dribbler from spinning
				if (BallObserver.getRealisticBallPos().distanceTo(this.RECEIVER.pos) < World.Ball.radius + this.RECEIVER.shootRadius + 0.1) {
					this.invisible = true;
					taskAssignments[this.RECEIVER] = Assignment.create({
						class: MoveToPos,
						params: [{ pos: this.RECEIVER.pos, dir: this._receiverBallDirection, ignoreBallPlacement: true, ignoreBall: true }],
						restart: true
					});
				} else {
					if (this.invisible) {
						this.forceSetBackInvisible = true;
					}
					this._receiverBallDirection = (BallObserver.getRealisticBallPos() - this.RECEIVER.pos).angle();
					taskAssignments[this.RECEIVER] = Assignment.create({
						class: MoveToPos,
						params: [{ pos: intersection, ignoreBallPlacement: true }],
						restart: true
					});
				}

				break;
			}
			case State.WAIT_FOR_SET_BACK: {
				this._mainAttacker = this.RECEIVER;
				if (this._stateChanged) {
					this._calculateEvadingPos();
				}
				taskAssignments[this.SHOOTER] = Assignment.create({ class: MoveToPos, params: [{ pos: this._selectedEvadingPos }] });
				taskAssignments[this.RECEIVER] = Assignment.create({ class: Halt, restart: this._stateChanged });

				break;
			}
			case State.SET_BACK_INVISIBLE: {
				this._mainAttacker = this.RECEIVER;
				if (this._stateChanged) {
					this._calculateEvadingPos();
				}
				taskAssignments[this.SHOOTER] = Assignment.create({ class: MoveToPos, params: [{ pos: this._selectedEvadingPos }] });
				if (this._stateChanged) {
					this._computedReceiverPos = this.RECEIVER.pos + (this.RECEIVER.pos - BallObserver.getRealisticBallPos()).withLength(2 * this.RECEIVER.radius);
				}
				if (this.forceSetBackInvisible) {
					this.setBackPosInvisible = this.RECEIVER.pos - (this._ballPlacementPos - this.RECEIVER.pos).withLength(SET_BACK_INVISIBLE_LENGTH);
					taskAssignments[this.RECEIVER] = Assignment.create({
						class: MoveToPos,
						params: [{
							pos: this.setBackPosInvisible,
							dir: (this._ballPlacementPos - this.RECEIVER.pos).angle(),
							ignoreBallPlacement: true,
							ignoreBall: true
						}],
						restart: this._stateChanged
					});
				} else {
					taskAssignments[this.RECEIVER] = Assignment.create({
						class: MoveToPos,
						params: [{
							pos: this._computedReceiverPos,
							ignoreBallPlacement: true,
							ignoreBall: true
						}],
						restart: this._stateChanged
					});
				}
				break;
			}
			case State.FINE_ADJUST: {
				this._mainAttacker = this.RECEIVER;
				taskAssignments[this.RECEIVER] = Assignment.create({
					class: PlaceBall,
					restart: this._stateChanged
				});
				if (this._stateChanged) {
					this._calculateEvadingPos();
				}
				taskAssignments[this.SHOOTER] = Assignment.create({
					class: MoveToPos,
					params: [{
						pos: this._selectedEvadingPos,
						customObstacles: SHOOTER_OBSTACLES,
						ignoreBallPlacement: true
					}],
					restart: this._stateChanged
				});

				break;
			}
			case State.WALLKICK: {
				this._mainAttacker = this.SHOOTER;

				taskAssignments[this.SHOOTER] = Assignment.create({
					class: Wallkick,
					params: [ this._ballPlacementPos],
					restart: this._stateChanged
				});
				taskAssignments[this.RECEIVER] = Assignment.create({
					class: MoveToPos,
					params: [{ pos: this._computedReceiverPos, ignoreBallPlacement: true }],
					restart: this._stateChanged
				});

				break;
			}
		}

		if (taskAssignments[this.SHOOTER] == undefined) {
			throw new Error("SHOOTER has no task assigned in state="  +  this._state);
		}
		if (taskAssignments[this.RECEIVER] == undefined) {
			throw new Error("RECEIVER has not task assigned in state="  +  this._state);
		}
		return {
			assignments: taskAssignments,
			mainAttacker: this._mainAttacker
		};
	}

	_calculateEvadingPos() {
		// Simple sampling from some preselected positions
		// If no fitting position could be found (because the field is too small) the last used position is chosen as fallback
		for (let pos of SHOOTER_EVADING_POSITIONS) {
			if (pos.distanceTo(this._ballPlacementPos) > FINE_ADJUST_ZONE) {
				this._selectedEvadingPos = pos;
				break;
			}
		}
	}

	_getNextState(currentState: string): State {
		let nextState = State.INVALID;

		let usedBallPos = BallObserver.getRealisticBallPos();
		switch (currentState) {
			case State.WAIT_FOR_BALL_STOP: {
				this.forceSetBackInvisible = false;
				this.invisible = false;
				nextState = State.WAIT_FOR_BALL_STOP;
				if (World.Ball.speed.length() < BALL_STOP_SPEED) {
					this._ballStartPos = usedBallPos;
					if (usedBallPos.distanceTo(this._ballPlacementPos) < FINE_ADJUST_ZONE) {
						nextState = State.FINE_ADJUST;
					} else if (!Field.isInField(usedBallPos, 0.05)
							&& (((BOUNDARY_WIDTH + World.Geometry.FieldWidthHalf) - Math.abs(World.Ball.pos.x)) > MIN_BOUNDARY_DIST)
							&& (Math.abs(World.Ball.pos.y) < World.Geometry.FieldHeightHalf - MIN_GOAL_LINE_DIST)) {
						nextState = State.WALLKICK;
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
			// same case as in t/a/placeball if you change something make sure to change it also in placeball
			case State.WALLKICK: {
				nextState = State.WALLKICK;
				// a different boundary width is used here (compared to wait for ball stop -> wallkick) as a hysteresis
				if (Field.isInField(usedBallPos, 0)) {
					this._wallKickTryTime = undefined;
					nextState = State.WAIT_FOR_BALL_STOP;
				}
				if (this._wallKickTryTime === undefined) {
					this._firstPosWallkick = usedBallPos;
					this._wallKickTryTime = World.Time;
				}
				if (World.Time - this._wallKickTryTime > 6) {
					this._wallKickTryTime = undefined;
					nextState = State.PULL_TO_FIELD;
				}
				if (World.Ball.speed.length() > 0.3 && usedBallPos.distanceTo(this._firstPosWallkick) > 0.3) {
					this._wallKickTryTime = undefined;
					nextState = State.WAIT_FOR_BALL_STOP;
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
				let ballDist = BallObserver.getRealisticBallPos().distanceTo(this.RECEIVER.pos);
				if (World.Ball.speed.length() < BALL_STOP_SPEED) {
					nextState = ballDist > MAX_BALL_DISTANCE ? State.WAIT_FOR_BALL_STOP : State.WAIT_FOR_SET_BACK;
				}
				if (!this._ballReceiverIntersects && ballDist > MAX_BALL_DISTANCE) {
					if (this.forceSetBackInvisible) {
						nextState = State.WAIT_FOR_SET_BACK;
					} else {
					nextState = State.WAIT_FOR_BALL_STOP;
					}
				}

				break;
			}
			case State.WAIT_FOR_SET_BACK: {
				nextState = State.WAIT_FOR_SET_BACK;
				if (World.Time - this._stateChangeTime > SETBACK_WAIT_TIME) {
					nextState = State.SET_BACK_INVISIBLE;
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
			case State.SET_BACK_INVISIBLE: {
				nextState = State.SET_BACK_INVISIBLE;
				if (World.Time - this._stateChangeTime > SET_BACK_MIN_WAIT_TIME) {
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

	private _determinePositions(extraDistance: number = 0.05) {
		let offset = (BallObserver.getRealisticBallPos() - this._ballPlacementPos).withLength(this.RECEIVER.shootRadius + World.Ball.radius + extraDistance);
		this._computedShooterPos = BallObserver.getRealisticBallPos() + offset;
		this._computedReceiverPos = this._ballPlacementPos - offset;
	}
}
