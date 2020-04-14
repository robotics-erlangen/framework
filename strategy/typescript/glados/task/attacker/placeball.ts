import { Ball } from "base/ball";
import * as Constants from "base/constants";
import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import * as Referee from "base/referee";
import { Position, RelativePosition } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { MessageType } from "glados/control/messaging";
import * as BallObserver from "glados/observer/ball";
import { Agent, Task } from "glados/task/base";
import { CurvedMaxAccel } from "glados/trajectory/curvedmaxaccel";
import { Direct } from "glados/trajectory/direct";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";

const enum State {
	WAIT_FOR_BALL_STOP	= "WAIT_FOR_BALL_STOP",
	GO_TO_PULL 			= "GO_TO_PULL",
	ENSURE_PULL_CONTACT = "ENSURE_PULL_CONTACT",
	PULL_TO_FIELD 		= "PULL_TO_FIELD",
	GO_TO_PUSH 			= "GO_TO_PUSH",
	PUSH_TO_POS 		= "PUSH_TO_POS",
	BACK_UP_WAIT 		= "BACK_UP_WAIT",
	BACK_UP 			= "BACK_UP",
	MOVE_AWAY 			= "MOVE_AWAY",
	INVALID				= "INVALID",
}

/** Maximum final distance from the ball to placement position */
const END_DISTANCE = 0.1;
const BALL_STOP_SPEED = 0.2;
const MAX_BALL_DISTANCE = 0.25;

/**
 * If the ball's distance to a target position (nearest position in the field
 * or final target pos) is larger than this, the corresponding offset gets
 * recalculated
 * @see PlaceBall._calculateOffsets
 */
const OFFSET_DISTANCE = 0.07;
/**
 * The number of kept directions from the ball to a target position
 * @see PlaceBall._calculateOffsets
 */
const OFFSET_FRAME_COUNT = 50;

const ENSURE_CONTACT_TIME = 0.5;
const ENSURE_CONTACT_MAX_TIME = 2;
const ENSURE_CONTACT_DRIBBLER_SPEED = 0.4;
const ENSURE_CONTACT_DIRECT_SPEED = 0.12;

const PULL_DRIBBLER_SPEED = 0.8;
const MAX_PULL_SPEED = 0.15;
const MAX_PULL_ACCEL = 0.15;
const PULL_LOST_BALL_HYSTERESIS = 1;

// TODO test max speeds for push
const PUSH_DRIBBLER_SPEED = 0.4;
const FAR_PUSH_SPEED = 1;
const NEAR_PUSH_SPEED = 0.25;
const PUSH_ACCEL_SCALE = 0.2;
const PUSH_LOST_BALL_HYSTERESIS = 1;

const BACK_UP_WAIT_TIME = 2;
const BACK_UP_SPEED = 0.4;

const MIN_TIME_IN_STATE = 0.1;


export class PlaceBall extends Task {

	private readonly OFFSET_SHOOT_LENGTH: number;
	private readonly OFFSET_EXTRA_LENGTH: number;
	private readonly FAR_NEAR_CUT: number;

	private _ball: Ball;

	private _placementPos: Position;

	private _state = State.WAIT_FOR_BALL_STOP;
	private _stateChanged = true;
	private _stateChangeTime = World.Time;

	private _ballStartPos: Position;
	private _robotStartPos: Position;

	private _currentTargetPos: Position | undefined = undefined;

	/**
	 * The last OFFSET_FRAME_COUNT directions from the ball to the placement target position
	 * @see _calculateOffsets
	 */
	private _placementOffsets: RelativePosition[] = [];
	/**
	 * The direction from the ball to the placement target position
	 * @see _calculateOffsets
	 */
	private _placementOffsetAverage: RelativePosition | undefined;
	/**
	 * Current frame used in the placement offset average calculation
	 * @see _placementOffsetAverage
	 * @see _calculateOffsets
	 */
	private _placementOffsetFrame = 0;

	/**
	 * The position inside the field, nearest to the ball
	 * @see _calculateOffsets
	 */
	private _nearestFieldPos: Position | undefined = undefined;

	/**
	 * The last OFFSET_FRAME_COUNT directions from the ball to it's nearest field pos
	 * @see _calculateOffsets
	 */
	private _borderOffsets: RelativePosition[] = [];
	/**
	 * The offset between the ball and the ball's nearest field pos
	 * @see _calculateOffsets
	 */
	private _borderOffsetAverage: RelativePosition | undefined;
	/**
	 * Current frame used in the border offset average calculation
	 * @see _borderOffsetAverage
	 * @see _calculateOffsets
	 */
	private _borderOffsetFrame = 0;

	private _barrierDetects = false;
	private _hasBallTime: number | undefined = undefined;
	private _lostBallTime: number | undefined = undefined;

	// Needed for back up
	// True if the previous ball moving state was PUSH_TO_POS, false otherwise
	// If additional ball moving states are to be added in the future, this boolean probably won't be enough
	private _pushedBefore = false;


	constructor(agent: Agent, placementPos?: Position) {
		super(agent);

		this.OFFSET_SHOOT_LENGTH = this._robot.shootRadius + World.Ball.radius;
		this.OFFSET_EXTRA_LENGTH = this.OFFSET_SHOOT_LENGTH + 0.1;
		this.FAR_NEAR_CUT = this._robot.shootRadius + World.Ball.radius;

		this._ball = World.Ball;
		this._placementPos = placementPos || <Position> World.BallPlacementPos;

		this._ballStartPos = this._ball.pos;
		this._robotStartPos = this._robot.pos;

		this._placementOffsetAverage = undefined;
		this._borderOffsetAverage = undefined;
	}

	run() {
		this._calculateOffsets();

		vis.addCircle("PlaceBall/Placement Pos", this._placementPos, OFFSET_DISTANCE, vis.colors.orange);
		vis.addPath("PlaceBall/Placement Pos", [ this._placementPos, this._placementPos + this._placementOffsetAverage! ], vis.colors.black);
		vis.addCircle("PlaceBall/Border Pos", this._nearestFieldPos!, OFFSET_DISTANCE, vis.colors.orange);
		vis.addPath("PlaceBall/Border Pos", [ this._nearestFieldPos!, this._nearestFieldPos! + this._borderOffsetAverage! ], vis.colors.black);

		let oldState = this._state;
		this._state = this._getNextState(this._state);
		this._stateChanged = this._state !== oldState;
		if (this._stateChanged) {
			this._stateChangeTime = World.Time;
		}
		debug.set("state", this._state);

		let obstacleTable: PathHelper.PathHelperParameters = {
			ignoreDefenseArea: true,
			ignoreOpponentDefenseArea: true,
			ignorePass: true,
			ignoreBallPlacementObstacle: true
		};
		obstacleTable.ignoreBall = this._state === State.ENSURE_PULL_CONTACT
								|| this._state === State.PULL_TO_FIELD
								|| this._state === State.BACK_UP_WAIT
								|| this._state === State.PUSH_TO_POS;
		if (this._state === State.GO_TO_PUSH) {
			obstacleTable.extraBallDistance = 2 * this._ball.radius;
		} else if (this._state === State.MOVE_AWAY || this._state === State.WAIT_FOR_BALL_STOP) {
			obstacleTable.extraBallDistance = this._robot.radius;
		}
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);

		// Extend field boundary so that the robot can pull the ball to the field from further out
		this._robot.path.setBoundary(
			-(World.Geometry.FieldWidthHalf + 5),
			-(World.Geometry.FieldHeightHalf + 5),
			World.Geometry.FieldWidthHalf + 5,
			World.Geometry.FieldHeightHalf + 5
		);

		switch (this._state) {
			case State.WAIT_FOR_BALL_STOP: {
				let ballVisible = this._ball.isPositionValid();

				let specificOffset = this._placementOffsetAverage!.copy().setLength(0.5);
				if (ballVisible) {
					this._currentTargetPos = this._ball.pos - specificOffset;
				} else {
					this._currentTargetPos = this._robot.pos - specificOffset;
				}
				this._robot.trajectory.update(CurvedMaxAccel, this._currentTargetPos, specificOffset.angle());

				break;
			}
			case State.GO_TO_PULL: {
				this._currentTargetPos = this._ball.pos - this._borderOffsetAverage!;
				// TODO max speed based on distance?
				this._robot.trajectory.update(CurvedMaxAccel, this._currentTargetPos, this._borderOffsetAverage!.angle());
				this._robotStartPos = this._currentTargetPos;

				break;
			}
			case State.ENSURE_PULL_CONTACT: {
				this._robot.setDribblerSpeed(ENSURE_CONTACT_DRIBBLER_SPEED);

				let speed = this._borderOffsetAverage!.copy().setLength(ENSURE_CONTACT_DIRECT_SPEED);
				this._robot.trajectory.update(Direct, speed, speed.angle());

				break;
			}
			case State.PULL_TO_FIELD: {
				this._robot.setDribblerSpeed(PULL_DRIBBLER_SPEED);
				// For _nearestFieldPos, see in calculateOffset
				if (this._stateChanged) {
					this._currentTargetPos = Field.limitToField(this._robot.pos) - this._borderOffsetAverage!;
				}
				this._robot.trajectory.update(CurvedMaxAccel, this._currentTargetPos!, this._borderOffsetAverage!.angle(), MAX_PULL_SPEED, undefined, MAX_PULL_ACCEL);

				break;
			}
			case State.GO_TO_PUSH: {
				this._currentTargetPos = this._ball.pos + this._placementOffsetAverage!;
				this._robot.trajectory.update(CurvedMaxAccel, this._currentTargetPos, (-this._placementOffsetAverage!).angle());
				this._robotStartPos = this._currentTargetPos;

				break;
			}
			case State.PUSH_TO_POS: {

				// TODO faster push at higher distance
				this._robot.setDribblerSpeed(PUSH_DRIBBLER_SPEED);
				this._currentTargetPos = this._placementPos + this._placementOffsetAverage!.copy().setLength(this.OFFSET_SHOOT_LENGTH);

				let speed = this._robot.pos.distanceTo(this._currentTargetPos) > this.FAR_NEAR_CUT ? FAR_PUSH_SPEED : NEAR_PUSH_SPEED;

				this._robot.trajectory.update(CurvedMaxAccel, this._currentTargetPos, (-this._placementOffsetAverage!).angle(), speed, undefined, PUSH_ACCEL_SCALE);

				break;
			}
			case State.BACK_UP_WAIT: {
				this._robot.halt();
				let timeInState = World.Time - this._stateChangeTime;
				let m = -4 * PUSH_DRIBBLER_SPEED / BACK_UP_WAIT_TIME;
				let f0 = 3 * PUSH_DRIBBLER_SPEED;
				// Linear dropoff between BACK_UP_WAIT_TIME / 4 and BACK_UP_WAIT_TIME / 2
				let dribblerSpeed = MathUtil.bound(0, m * timeInState + f0, PUSH_DRIBBLER_SPEED);
				this._robot.setDribblerSpeed(dribblerSpeed);

				break;
			}
			case State.BACK_UP: {
				// Ever making the the offset dependent on something near the target position was a mistake
				if (this._stateChanged) {
					let offset = (this._robotStartPos - this._ballStartPos).setLength(this.OFFSET_EXTRA_LENGTH);
					this._currentTargetPos = this._robot.pos + offset;
				}
				this._robot.trajectory.update(CurvedMaxAccel, this._currentTargetPos!, this._robot.dir, BACK_UP_SPEED);

				break;
			}
			case State.MOVE_AWAY: {
				const dist = Referee.isFriendlyFreeKickState(World.NextRefereeState)
					? 0.08 + this._robot.radius
					: Constants.stopBallDistance + 0.05 + this._robot.radius;
				let offset = (World.Geometry.FriendlyGoal - this._ball.pos).setLength(dist);
				this._currentTargetPos = this._ball.pos + offset;
				this._robot.trajectory.update(CurvedMaxAccel, this._currentTargetPos, (-offset).angle());

				break;
			}
		}

		if (this._state !== State.WAIT_FOR_BALL_STOP) {
			this._messaging.sendBroadcast(MessageType.placingRobot);
		}
	}

	private _getNextState(currentState: State): State {
		if (World.Time - this._stateChangeTime < MIN_TIME_IN_STATE) {
			return currentState;
		}

		let nextState = State.INVALID;

		switch (currentState) {
			case State.WAIT_FOR_BALL_STOP: {
				nextState = State.WAIT_FOR_BALL_STOP;

				if (this._ball.speed.length() < BALL_STOP_SPEED) {
					this._ballStartPos = this._ball.pos;

					if (this._ball.pos.distanceTo(this._placementPos) < END_DISTANCE) {
						nextState = State.MOVE_AWAY;
					} else if (!Field.isInField(this._ball.pos)
							|| Field.isInFriendlyGoal(this._ball.pos)
							|| Field.isInOpponentGoal(this._ball.pos)) {
						nextState = State.GO_TO_PULL;
					} else {
						nextState = State.GO_TO_PUSH;
					}
				}

				break;
			}
			case State.GO_TO_PULL: {
				nextState = State.GO_TO_PULL;

				if (this._ball.speed.length() > BALL_STOP_SPEED
						|| this._ball.pos.distanceTo(this._ballStartPos) > MAX_BALL_DISTANCE) {
					nextState = State.WAIT_FOR_BALL_STOP;
				} else if (this._robot.pos.distanceTo(<Position> this._currentTargetPos) < 0.01) {
					nextState = State.ENSURE_PULL_CONTACT;
				}

				break;
			}
			case State.ENSURE_PULL_CONTACT: {
				nextState = State.ENSURE_PULL_CONTACT;

				if (World.Time - this._stateChangeTime > ENSURE_CONTACT_MAX_TIME) {
					this._hasBallTime = undefined;
					nextState = State.PULL_TO_FIELD;
				} else if (this._barrierDetects) {
					if (this._hasBallTime == undefined) {
						this._hasBallTime = World.Time;
					} else if (World.Time - this._hasBallTime > ENSURE_CONTACT_TIME) {
						this._hasBallTime = undefined;
						nextState = State.PULL_TO_FIELD;
					}
				}

				break;
			}
			case State.PULL_TO_FIELD: {
				this._pushedBefore = false;

				nextState = State.PULL_TO_FIELD;
				let ballVisible = this._ball.isPositionValid();

				if (ballVisible && this._ball.pos.distanceTo(this._robot.pos) > this._robot.radius + 0.1) {
					if (this._lostBallTime == undefined) {
						this._lostBallTime = World.Time;
					} else if (World.Time - this._lostBallTime > PULL_LOST_BALL_HYSTERESIS) {
						this._lostBallTime = undefined;
						nextState = State.WAIT_FOR_BALL_STOP;
					}
				} else {
					this._lostBallTime = undefined;
					if (this._robot.pos.distanceTo(<Position> this._currentTargetPos) < 0.01) {
						nextState = State.BACK_UP_WAIT;
					}
				}

				break;
			}
			case State.GO_TO_PUSH: {
				nextState = State.GO_TO_PUSH;

				if (this._ball.speed.length() > BALL_STOP_SPEED
						|| this._ball.pos.distanceTo(this._ballStartPos) > MAX_BALL_DISTANCE) {
					nextState = State.WAIT_FOR_BALL_STOP;
				} else if (this._robot.pos.distanceTo(<Position> this._currentTargetPos) < 0.01) {
					nextState = State.PUSH_TO_POS;
				}

				break;
			}
			case State.PUSH_TO_POS: {
				this._pushedBefore = true;

				nextState = State.PUSH_TO_POS;
				let ballVisible = this._ball.isPositionValid();

				if (ballVisible && this._ball.pos.distanceTo(this._robot.pos) > this._robot.radius + 0.1) {
					if (this._lostBallTime == undefined) {
						this._lostBallTime = World.Time;
					} else if (World.Time - this._lostBallTime > PUSH_LOST_BALL_HYSTERESIS) {
						this._lostBallTime = undefined;
						nextState = State.WAIT_FOR_BALL_STOP;
					}
				} else {
					this._lostBallTime = undefined;
					if (this._robot.pos.distanceTo(<Position> this._currentTargetPos) < 0.01) {
						nextState = State.BACK_UP_WAIT;
					}
				}

				break;
			}
			case State.BACK_UP_WAIT: {
				nextState = State.BACK_UP_WAIT;

				if (World.Time - this._stateChangeTime > BACK_UP_WAIT_TIME) {
					nextState = State.BACK_UP;
				}

				break;
			}
			case State.BACK_UP: {
				nextState = State.BACK_UP;

				if (this._robot.pos.distanceTo(<Position> this._currentTargetPos) < 0.01) {
					nextState = State.WAIT_FOR_BALL_STOP;
				}

				break;
			}
			case State.MOVE_AWAY: {
				nextState = State.MOVE_AWAY;

				if (this._ball.pos.distanceTo(this._placementPos) > END_DISTANCE) {
					nextState = State.WAIT_FOR_BALL_STOP;
				}

				break;
			}
			default:
				break;
		}

		if (nextState === State.INVALID) {
			throw new Error(`nextState invalid, currentState=${currentState} is probably invalid`);
		}

		return nextState;
	}

	private _calculateOffsets() {
		let ballVisible = this._ball.isPositionValid();

		let usedBallPos = BallObserver.getRealisticBallPos();
		this._nearestFieldPos = Field.limitToField(usedBallPos);

		if (this._placementOffsetAverage == undefined || (usedBallPos.distanceTo(this._placementPos) > OFFSET_DISTANCE
				&& ballVisible)) {
			let currentOffset = (usedBallPos - this._placementPos).normalize();
			if (currentOffset.lengthSq() > 1e-9) {
				this._placementOffsets[this._placementOffsetFrame] = currentOffset;
				this._placementOffsetFrame = (this._placementOffsetFrame + 1) % OFFSET_FRAME_COUNT;
				this._placementOffsetAverage = geom.center(this._placementOffsets).setLength(this.OFFSET_EXTRA_LENGTH);
			}
		}

		if (this._borderOffsetAverage == undefined || (usedBallPos.distanceTo(this._nearestFieldPos) > OFFSET_DISTANCE
				&& ballVisible)) {
			this._borderOffsets[this._borderOffsetFrame] = (usedBallPos - this._nearestFieldPos).normalize();
			this._borderOffsetFrame = (this._borderOffsetFrame + 1) % OFFSET_FRAME_COUNT;
			this._borderOffsetAverage = geom.center(this._borderOffsets).setLength(this.OFFSET_EXTRA_LENGTH);
		}
	}
}
