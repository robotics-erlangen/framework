let PlaceBall = Class("Task.PlaceBall", require "task/base")

// Requires
import * as Constants from "base/constants";
import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as vis from "base/vis";
import * as World from "base/world";
let Direct = require "trajectory/direct"
let BallObserver = require "observer/ball"
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";

// States
let STATE_WAIT_FOR_BALL_STOP = "STATE_WAIT_FOR_BALL_STOP"
let STATE_GO_TO_PULL = "STATE_GO_TO_PULL"
let STATE_ENSURE_PULL_CONTACT = "STATE_ENSURE_PULL_CONTACT"
let STATE_PULL_TO_FIELD = "STATE_PULL_TO_FIELD"
let STATE_GO_TO_PUSH = "STATE_GO_TO_PUSH"
let STATE_PUSH_TO_POS = "STATE_PUSH_TO_POS"
let STATE_BACK_UP_WAIT = "STATE_BACK_UP_WAIT"
let STATE_BACK_UP = "STATE_BACK_UP"
let STATE_MOVE_AWAY = "STATE_MOVE_AWAY"

// Other constants

// Maximum final distance from ball to placement pos
let END_DISTANCE = 0.1
let BALL_STOP_SPEED = 0.2
let MAX_BALL_DISTANCE = 0.25

// If ball distance is larger than this, the corresponding offset gets recalculated
let OFFSET_DISTANCE = 0.07
let OFFSET_FRAME_COUNT = 50
let OFFSET_SHOOT_LENGTH
let OFFSET_EXTRA_LENGTH

let ENSURE_CONTACT_TIME = 0.5
let ENSURE_CONTACT_MAX_TIME = 2
let ENSURE_CONTACT_DRIBBLER_SPEED = 0.4
let ENSURE_CONTACT_DIRECT_SPEED = 0.12

let PULL_DRIBBLER_SPEED = 0.8
let MAX_PULL_SPEED = 0.15
let MAX_PULL_ACCEL = 0.15
let PULL_LOST_BALL_HYSTERESIS = 1

// TODO test max speeds for push
let PUSH_DRIBBLER_SPEED = 0.4
let FAR_NEAR_CUT
let FAR_PUSH_SPEED = 1
let NEAR_PUSH_SPEED = 0.25
let PUSH_ACCEL_SCALE = 0.2
let PUSH_LOST_BALL_HYSTERESIS = 1

let BACK_UP_WAIT_TIME = 2
let BACK_UP_SPEED = 0.4

let MIN_TIME_IN_STATE = 0.1

function PlaceBall:_init (placementPos) {
	this._placementPos = placementPos || World.BallPlacementPos

	this._ball = World.Ball

	this._state = STATE_WAIT_FOR_BALL_STOP
	this._stateChanged = true
	this._stateChangeTime = World.Time
	this._ballStartPos = this._ball.pos
	this._robotStartPos = this._robot.pos

	this._currentTargetPos = nil

	OFFSET_SHOOT_LENGTH = this._robot.shootRadius + this._ball.radius
	OFFSET_EXTRA_LENGTH = OFFSET_SHOOT_LENGTH + 0.1

	FAR_NEAR_CUT = this._robot.shootRadius + this._ball.radius + 0.2

	// See _calculateOffsets()
	this._placementOffsets = {}
	this._placementOffsetAverage = -this._robot.pos.copy().setLength(OFFSET_EXTRA_LENGTH)
	this._placementOffsetFrame = 1

	this._nearestFieldPos = nil
	this._borderOffsets = {}
	this._borderOffsetAverage = this._robot.pos.copy().setLength(OFFSET_EXTRA_LENGTH)
	this._borderOffsetFrame = 1

	this._barrierDetects = false
	this._ballInDribbler = false
	this._hasBallTime = nil
	this._lostBallTime = nil

	// Needed for back up
	// True if the previous ball moving state was STATE_PUSH_TO_POS, false otherwise
	// If additional ball moving states are to be added in the future, this boolean probably won't be enough
	this._pushedBefore = false
}

function PlaceBall:run () {

	this._calculateOffsets()
	vis.addCircle("PlaceBall Placement Pos", this._placementPos, OFFSET_DISTANCE, vis.colors.orange)
	vis.addPath("PlaceBall Placement Pos", { this._placementPos, this._placementPos + this._placementOffsetAverage }, vis.colors.black)
	vis.addCircle("PlaceBall Border Pos", this._nearestFieldPos, OFFSET_DISTANCE, vis.colors.orange)
	vis.addPath("PlaceBall Border Pos", { this._nearestFieldPos, this._nearestFieldPos + this._borderOffsetAverage }, vis.colors.black)

	let oldState = this._state
	this._state = this._getNextState(this._state)
	this._stateChanged = this._state != oldState
	if (this._stateChanged) {
		this._stateChangeTime = World.Time
	}
	debug.set("state", this._state)

	// Path helping
	let obstacleTable = {
		ignoreDefenseArea = true,
		ignoreOpponentDefenseArea = true,
		ignorePass = true,
        ignoreBallPlacementObstacle = true
	}
	obstacleTable.ignoreBall = this._state == STATE_ENSURE_PULL_CONTACT
					 ||  this._state == STATE_PULL_TO_FIELD
					 ||  this._state == STATE_BACK_UP_WAIT
					 ||  this._state == STATE_PUSH_TO_POS
	if (this._state == STATE_GO_TO_PUSH) {
		obstacleTable.extraBallDistance = 2 * this._ball.radius
	} else if (this._state == STATE_MOVE_AWAY || this._state == STATE_WAIT_FOR_BALL_STOP) {
		obstacleTable.extraBallDistance = this._robot.radius
	}
	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)

	// Extend field boundary so that the robot can pull the ball to the field from further out
	this._robot.path:setBoundary(
		-(World.Geometry.FieldWidthHalf + 5),
		-(World.Geometry.FieldHeightHalf + 5),
		World.Geometry.FieldWidthHalf + 5,
		World.Geometry.FieldHeightHalf + 5
	)

	if (this._state == STATE_WAIT_FOR_BALL_STOP) {

		let ballVisible = this._ball:isPositionValid()

		let specificOffset = this._placementOffsetAverage.copy().setLength(0.5)
		if (ballVisible) {
			this._currentTargetPos = this._ball.pos - specificOffset
		} else {
			this._currentTargetPos = this._robot.pos - specificOffset
		}
		this._robot.trajectory.update(ToTarget, this._currentTargetPos, specificOffset.angle())

	} else if (this._state == STATE_GO_TO_PULL) {

		this._currentTargetPos = this._ball.pos - this._borderOffsetAverage
		// TODO max speed based on distance?
		this._robot.trajectory.update(ToTarget, this._currentTargetPos, this._borderOffsetAverage.angle())
		this._robotStartPos = this._currentTargetPos

	} else if (this._state == STATE_ENSURE_PULL_CONTACT) {

		this._robot:setDribblerSpeed(ENSURE_CONTACT_DRIBBLER_SPEED)

		let speed = this._borderOffsetAverage.copy().setLength(ENSURE_CONTACT_DIRECT_SPEED)
		this._robot.trajectory.update(Direct, speed, speed.angle())

	} else if (this._state == STATE_PULL_TO_FIELD) {

		this._robot:setDribblerSpeed(PULL_DRIBBLER_SPEED)
		// For _nearestFieldPos, see in calculateOffset
		if (this._stateChanged) {
			this._currentTargetPos = Field.limitToField(this._robot.pos) - this._borderOffsetAverage
		}
		this._robot.trajectory.update(ToTarget, this._currentTargetPos, this._borderOffsetAverage.angle(), MAX_PULL_SPEED, undefined, MAX_PULL_ACCEL)

	} else if (this._state == STATE_GO_TO_PUSH) {

		this._currentTargetPos = this._ball.pos + this._placementOffsetAverage
		this._robot.trajectory.update(ToTarget, this._currentTargetPos, (-this._placementOffsetAverage).angle())
		this._robotStartPos = this._currentTargetPos

	} else if (this._state == STATE_PUSH_TO_POS) {

		//TODO faster push at higher distance
		this._robot:setDribblerSpeed(PUSH_DRIBBLER_SPEED)
		this._currentTargetPos = this._placementPos + this._placementOffsetAverage.copy().setLength(OFFSET_SHOOT_LENGTH)

		let speed = this._robot.pos.distanceTo(this._currentTargetPos) > FAR_NEAR_CUT ? FAR_PUSH_SPEED : NEAR_PUSH_SPEED

		this._robot.trajectory.update(ToTarget, this._currentTargetPos, (-this._placementOffsetAverage).angle(), speed, undefined, PUSH_ACCEL_SCALE)

	} else if (this._state == STATE_BACK_UP_WAIT) {

		this._robot:halt()
		let timeInState = World.Time - this._stateChangeTime
		let m = -4 * PUSH_DRIBBLER_SPEED / BACK_UP_WAIT_TIME
		let f0 = 3 * PUSH_DRIBBLER_SPEED
		// Linear dropoff between BACK_UP_WAIT_TIME / 4 and BACK_UP_WAIT_TIME / 2
		let dribblerSpeed = MathUtil.bound(0, m * timeInState + f0, PUSH_DRIBBLER_SPEED)
		this._robot:setDribblerSpeed(dribblerSpeed)

	} else if (this._state == STATE_BACK_UP) {

		// Ever making the the offset dependent on something near the target position was a mistake
		if (this._stateChanged) {
			let offset = (this._robotStartPos - this._ballStartPos).setLength(OFFSET_EXTRA_LENGTH)
			this._currentTargetPos = this._robot.pos + offset
		}

		this._robot.trajectory.update(ToTarget, this._currentTargetPos, this._robot.dir, BACK_UP_SPEED)

	} else if (this._state == STATE_MOVE_AWAY) {

		let offset = (World.Geometry.FriendlyGoal - this._ball.pos).setLength(Constants.stopBallDistance + 0.1)
		this._currentTargetPos = this._ball.pos + offset
		this._robot.trajectory.update(ToTarget, this._currentTargetPos, -offset.angle())

	}

}

function PlaceBall:_getNextState (currentState) {
	if (World.Time - this._stateChangeTime < MIN_TIME_IN_STATE) {
		return currentState
	}

	let nextState

	if (currentState == STATE_WAIT_FOR_BALL_STOP) {

		nextState = STATE_WAIT_FOR_BALL_STOP

		if (this._ball.speed.length() < BALL_STOP_SPEED) {

            this._ballStartPos = this._ball.pos

			if (this._ball.pos.distanceTo(this._placementPos) < END_DISTANCE) {
				nextState = STATE_MOVE_AWAY
			} else if (not Field.isInField(this._ball.pos)
					 ||  Field.isInFriendlyGoal(this._ball.pos)
					 ||  Field.isInOpponentGoal(this._ball.pos)) {
				nextState = STATE_GO_TO_PULL
			} else {
				nextState = STATE_GO_TO_PUSH
			}

		}

	} else if (currentState == STATE_GO_TO_PULL) {

		nextState = STATE_GO_TO_PULL

		if (this._ball.speed.length() > BALL_STOP_SPEED
                || this._ball.pos.distanceTo(this._ballStartPos) > MAX_BALL_DISTANCE) {
			nextState = STATE_WAIT_FOR_BALL_STOP
		} else if (this._robot.pos.distanceTo(this._currentTargetPos) < 0.01) {
			nextState = STATE_ENSURE_PULL_CONTACT
		}

	} else if (currentState == STATE_ENSURE_PULL_CONTACT) {

		nextState = STATE_ENSURE_PULL_CONTACT

		if (World.Time - this._stateChangeTime > ENSURE_CONTACT_MAX_TIME) {
			this._hasBallTime = nil
			nextState = STATE_PULL_TO_FIELD
		} else if (this._barrierDetects) {
			if (not this._hasBallTime) {
				this._hasBallTime = World.Time
			} else if (World.Time - this._hasBallTime > ENSURE_CONTACT_TIME) {
				this._hasBallTime = nil
				nextState = STATE_PULL_TO_FIELD
			}
		} else {
			this._hasBallTime = nil
		}

	} else if (currentState == STATE_PULL_TO_FIELD) {

		this._pushedBefore = false

		nextState = STATE_PULL_TO_FIELD
		let ballVisible = this._ball:isPositionValid()

		if (ballVisible && this._ball.pos.distanceTo(this._robot.pos) > this._robot.radius + 0.1) {
			if (not this._lostBallTime) {
				this._lostBallTime = World.Time
			} else if (World.Time - this._lostBallTime > PULL_LOST_BALL_HYSTERESIS) {
				this._lostBallTime = nil
				nextState = STATE_WAIT_FOR_BALL_STOP
			}
		} else {
			this._lostBallTime = nil
			if (this._robot.pos.distanceTo(this._currentTargetPos) < 0.01) {
				nextState = STATE_BACK_UP_WAIT
			}
		}

	} else if (currentState == STATE_GO_TO_PUSH) {

		nextState = STATE_GO_TO_PUSH
		if (this._ball.speed.length() > BALL_STOP_SPEED
                || this._ball.pos.distanceTo(this._ballStartPos) > MAX_BALL_DISTANCE) {
			nextState = STATE_WAIT_FOR_BALL_STOP
		} else if (this._robot.pos.distanceTo(this._currentTargetPos) < 0.01) {
			nextState = STATE_PUSH_TO_POS
		}

	} else if (currentState == STATE_PUSH_TO_POS) {

		this._pushedBefore = true

		nextState = STATE_PUSH_TO_POS
		let ballVisible = this._ball:isPositionValid()

		if (ballVisible && this._ball.pos.distanceTo(this._robot.pos) > this._robot.radius + 0.1) {
			if (not this._lostBallTime) {
				this._lostBallTime = World.Time
			} else if (World.Time - this._lostBallTime > PUSH_LOST_BALL_HYSTERESIS) {
				this._lostBallTime = nil
				nextState = STATE_WAIT_FOR_BALL_STOP
			}
		} else {
			this._lostBallTime = nil
			if (this._robot.pos.distanceTo(this._currentTargetPos) < 0.01) {
				nextState = STATE_BACK_UP_WAIT
			}
		}

	} else if (currentState == STATE_BACK_UP_WAIT) {

		nextState = STATE_BACK_UP_WAIT
		if (World.Time - this._stateChangeTime > BACK_UP_WAIT_TIME) {
			nextState = STATE_BACK_UP
		}

	} else if (currentState == STATE_BACK_UP) {

		nextState = STATE_BACK_UP
		if (this._robot.pos.distanceTo(this._currentTargetPos) < 0.01) {
			nextState = STATE_WAIT_FOR_BALL_STOP
		}

	} else if (currentState == STATE_MOVE_AWAY) {

		nextState = STATE_MOVE_AWAY
		if (this._ball.pos.distanceTo(this._placementPos) > END_DISTANCE) {
			nextState = STATE_WAIT_FOR_BALL_STOP
		}

	}

	if (not nextState) {
		error("nextState can't be undefined, currentState="  +  currentState  +  " is probably invalid")
	}
	return nextState

}

function PlaceBall:_calculateOffsets () {

	let ballVisible = this._ball:isPositionValid()

	let usedBallPos = BallObserver.getRealisticBallPos()
	this._nearestFieldPos = Field.limitToField(usedBallPos)

	if ((not this._placementOffsetAverage || usedBallPos.distanceTo(this._placementPos) > OFFSET_DISTANCE)
			 &&  ballVisible) {
		let currentOffset = (usedBallPos - this._placementPos):normalize()
		if (currentOffset.lengthSq() > 1e-9) {
			this._placementOffsets[this._placementOffsetFrame] = currentOffset
			this._placementOffsetFrame = (this._placementOffsetFrame % OFFSET_FRAME_COUNT) + 1
			this._placementOffsetAverage = geom.center(this._placementOffsets).setLength(OFFSET_EXTRA_LENGTH)
		}
	}

	if ((not this._borderOffsetAverage || usedBallPos.distanceTo(this._nearestFieldPos) > OFFSET_DISTANCE)
			 &&  ballVisible) {
		let currentOffset = (usedBallPos - this._placementPos):normalize()
		if (currentOffset.lengthSq() > 1e-9) {
			this._borderOffsets[this._borderOffsetFrame] = (usedBallPos - this._nearestFieldPos):normalize()
			this._borderOffsetFrame = (this._borderOffsetFrame % OFFSET_FRAME_COUNT) + 1
			this._borderOffsetAverage = geom.center(this._borderOffsets).setLength(OFFSET_EXTRA_LENGTH)
		}
	}

}


function PlaceBall:_updateBallStatus () {
	if (this._robot.radioResponse) {
		this._barrierDetects = this._robot.radioResponse.ball_detected
	}
	debug.set("barrier detects", this._barrierDetects)
}

return PlaceBall
