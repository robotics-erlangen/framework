let PlaceBall = Class("Task.PlaceBall", require "task/base")

// Requires
let Constants = require "../base/constants"
let debug = require "../base/debug"
let Field = require "../base/field"
let geom = require "../base/geom"
let vis = require "../base/vis"
let World = require "../base/world"
let Direct = require "trajectory/direct"
let BallObserver = require "observer/ball"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"

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
	self._placementPos = placementPos  ||  World.BallPlacementPos

	self._ball = World.Ball

	self._state = STATE_WAIT_FOR_BALL_STOP
	self._stateChanged = true
	self._stateChangeTime = World.Time
	self._ballStartPos = self._ball.pos
	self._robotStartPos = self._robot.pos

	self._currentTargetPos = nil

	OFFSET_SHOOT_LENGTH = self._robot.shootRadius + self._ball.radius
	OFFSET_EXTRA_LENGTH = OFFSET_SHOOT_LENGTH + 0.1

	FAR_NEAR_CUT = self._robot.shootRadius + self._ball.radius + 0.2

	// See _calculateOffsets()
	self._placementOffsets = {}
	self._placementOffsetAverage = -self._robot.pos:copy():setLength(OFFSET_EXTRA_LENGTH)
	self._placementOffsetFrame = 1

	self._nearestFieldPos = nil
	self._borderOffsets = {}
	self._borderOffsetAverage = self._robot.pos:copy():setLength(OFFSET_EXTRA_LENGTH)
	self._borderOffsetFrame = 1

	self._barrierDetects = false
	self._ballInDribbler = false
	self._hasBallTime = nil
	self._lostBallTime = nil

	// Needed for back up
	// True if the previous ball moving state was STATE_PUSH_TO_POS, false otherwise
	// If additional ball moving states are to be added in the future, this boolean probably won't be enough
	self._pushedBefore = false
}

function PlaceBall:run () {

	self:_calculateOffsets()
	vis.addCircle("PlaceBall Placement Pos", self._placementPos, OFFSET_DISTANCE, vis.colors.orange)
	vis.addPath("PlaceBall Placement Pos", { self._placementPos, self._placementPos + self._placementOffsetAverage }, vis.colors.black)
	vis.addCircle("PlaceBall Border Pos", self._nearestFieldPos, OFFSET_DISTANCE, vis.colors.orange)
	vis.addPath("PlaceBall Border Pos", { self._nearestFieldPos, self._nearestFieldPos + self._borderOffsetAverage }, vis.colors.black)

	let oldState = self._state
	self._state = self:_getNextState(self._state)
	self._stateChanged = self._state != oldState
	if (self._stateChanged) {
		self._stateChangeTime = World.Time
	}
	debug.set("state", self._state)

	// Path helping
	let obstacleTable = {
		ignoreDefenseArea = true,
		ignoreOpponentDefenseArea = true,
		ignorePass = true,
        ignoreBallPlacementObstacle = true
	}
	obstacleTable.ignoreBall = self._state == STATE_ENSURE_PULL_CONTACT
					 ||  self._state == STATE_PULL_TO_FIELD
					 ||  self._state == STATE_BACK_UP_WAIT
					 ||  self._state == STATE_PUSH_TO_POS
	if (self._state == STATE_GO_TO_PUSH) {
		obstacleTable.extraBallDistance = 2 * self._ball.radius
	} else if (self._state == STATE_MOVE_AWAY  ||  self._state == STATE_WAIT_FOR_BALL_STOP) {
		obstacleTable.extraBallDistance = self._robot.radius
	}
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)

	// Extend field boundary so that the robot can pull the ball to the field from further out
	self._robot.path:setBoundary(
		-(World.Geometry.FieldWidthHalf + 5),
		-(World.Geometry.FieldHeightHalf + 5),
		World.Geometry.FieldWidthHalf + 5,
		World.Geometry.FieldHeightHalf + 5
	)

	if (self._state == STATE_WAIT_FOR_BALL_STOP) {

		let ballVisible = self._ball:isPositionValid()

		let specificOffset = self._placementOffsetAverage:copy():setLength(0.5)
		if (ballVisible) {
			self._currentTargetPos = self._ball.pos - specificOffset
		} else {
			self._currentTargetPos = self._robot.pos - specificOffset
		}
		self._robot.trajectory:update(ToTarget, self._currentTargetPos, specificOffset:angle())

	} else if (self._state == STATE_GO_TO_PULL) {

		self._currentTargetPos = self._ball.pos - self._borderOffsetAverage
		// TODO max speed based on distance?
		self._robot.trajectory:update(ToTarget, self._currentTargetPos, self._borderOffsetAverage:angle())
		self._robotStartPos = self._currentTargetPos

	} else if (self._state == STATE_ENSURE_PULL_CONTACT) {

		self._robot:setDribblerSpeed(ENSURE_CONTACT_DRIBBLER_SPEED)

		let speed = self._borderOffsetAverage:copy():setLength(ENSURE_CONTACT_DIRECT_SPEED)
		self._robot.trajectory:update(Direct, speed, speed:angle())

	} else if (self._state == STATE_PULL_TO_FIELD) {

		self._robot:setDribblerSpeed(PULL_DRIBBLER_SPEED)
		// For _nearestFieldPos, see in calculateOffset
		if (self._stateChanged) {
			self._currentTargetPos = Field.limitToField(self._robot.pos) - self._borderOffsetAverage
		}
		self._robot.trajectory:update(ToTarget, self._currentTargetPos, self._borderOffsetAverage:angle(), MAX_PULL_SPEED, nil, MAX_PULL_ACCEL)

	} else if (self._state == STATE_GO_TO_PUSH) {

		self._currentTargetPos = self._ball.pos + self._placementOffsetAverage
		self._robot.trajectory:update(ToTarget, self._currentTargetPos, (-self._placementOffsetAverage):angle())
		self._robotStartPos = self._currentTargetPos

	} else if (self._state == STATE_PUSH_TO_POS) {

		//TODO faster push at higher distance
		self._robot:setDribblerSpeed(PUSH_DRIBBLER_SPEED)
		self._currentTargetPos = self._placementPos + self._placementOffsetAverage:copy():setLength(OFFSET_SHOOT_LENGTH)

		let speed = self._robot.pos:distanceTo(self._currentTargetPos) > FAR_NEAR_CUT ? FAR_PUSH_SPEED : NEAR_PUSH_SPEED

		self._robot.trajectory:update(ToTarget, self._currentTargetPos, (-self._placementOffsetAverage):angle(), speed, nil, PUSH_ACCEL_SCALE)

	} else if (self._state == STATE_BACK_UP_WAIT) {

		self._robot:halt()
		let timeInState = World.Time - self._stateChangeTime
		let m = -4 * PUSH_DRIBBLER_SPEED / BACK_UP_WAIT_TIME
		let f0 = 3 * PUSH_DRIBBLER_SPEED
		// Linear dropoff between BACK_UP_WAIT_TIME / 4 and BACK_UP_WAIT_TIME / 2
		let dribblerSpeed = math.bound(0, m * timeInState + f0, PUSH_DRIBBLER_SPEED)
		self._robot:setDribblerSpeed(dribblerSpeed)

	} else if (self._state == STATE_BACK_UP) {

		// Ever making the the offset dependent on something near the target position was a mistake
		if (self._stateChanged) {
			let offset = (self._robotStartPos - self._ballStartPos):setLength(OFFSET_EXTRA_LENGTH)
			self._currentTargetPos = self._robot.pos + offset
		}

		self._robot.trajectory:update(ToTarget, self._currentTargetPos, self._robot.dir, BACK_UP_SPEED)

	} else if (self._state == STATE_MOVE_AWAY) {

		let offset = (World.Geometry.FriendlyGoal - self._ball.pos):setLength(Constants.stopBallDistance + 0.1)
		self._currentTargetPos = self._ball.pos + offset
		self._robot.trajectory:update(ToTarget, self._currentTargetPos, -offset:angle())

	}

}

function PlaceBall:_getNextState (currentState) {
	if (World.Time - self._stateChangeTime < MIN_TIME_IN_STATE) {
		return currentState
	}

	let nextState

	if (currentState == STATE_WAIT_FOR_BALL_STOP) {

		nextState = STATE_WAIT_FOR_BALL_STOP

		if (self._ball.speed:length() < BALL_STOP_SPEED) {

            self._ballStartPos = self._ball.pos

			if (self._ball.pos:distanceTo(self._placementPos) < END_DISTANCE) {
				nextState = STATE_MOVE_AWAY
			} else if (not Field.isInField(self._ball.pos)
					 ||  Field.isInFriendlyGoal(self._ball.pos)
					 ||  Field.isInOpponentGoal(self._ball.pos)) {
				nextState = STATE_GO_TO_PULL
			} else {
				nextState = STATE_GO_TO_PUSH
			}

		}

	} else if (currentState == STATE_GO_TO_PULL) {

		nextState = STATE_GO_TO_PULL

		if (self._ball.speed:length() > BALL_STOP_SPEED
                 ||  self._ball.pos:distanceTo(self._ballStartPos) > MAX_BALL_DISTANCE) {
			nextState = STATE_WAIT_FOR_BALL_STOP
		} else if (self._robot.pos:distanceTo(self._currentTargetPos) < 0.01) {
			nextState = STATE_ENSURE_PULL_CONTACT
		}

	} else if (currentState == STATE_ENSURE_PULL_CONTACT) {

		nextState = STATE_ENSURE_PULL_CONTACT

		if (World.Time - self._stateChangeTime > ENSURE_CONTACT_MAX_TIME) {
			self._hasBallTime = nil
			nextState = STATE_PULL_TO_FIELD
		} else if (self._barrierDetects) {
			if (not self._hasBallTime) {
				self._hasBallTime = World.Time
			} else if (World.Time - self._hasBallTime > ENSURE_CONTACT_TIME) {
				self._hasBallTime = nil
				nextState = STATE_PULL_TO_FIELD
			}
		} else {
			self._hasBallTime = nil
		}

	} else if (currentState == STATE_PULL_TO_FIELD) {

		self._pushedBefore = false

		nextState = STATE_PULL_TO_FIELD
		let ballVisible = self._ball:isPositionValid()

		if (ballVisible  &&  self._ball.pos:distanceTo(self._robot.pos) > self._robot.radius + 0.1) {
			if (not self._lostBallTime) {
				self._lostBallTime = World.Time
			} else if (World.Time - self._lostBallTime > PULL_LOST_BALL_HYSTERESIS) {
				self._lostBallTime = nil
				nextState = STATE_WAIT_FOR_BALL_STOP
			}
		} else {
			self._lostBallTime = nil
			if (self._robot.pos:distanceTo(self._currentTargetPos) < 0.01) {
				nextState = STATE_BACK_UP_WAIT
			}
		}

	} else if (currentState == STATE_GO_TO_PUSH) {

		nextState = STATE_GO_TO_PUSH
		if (self._ball.speed:length() > BALL_STOP_SPEED
                 ||  self._ball.pos:distanceTo(self._ballStartPos) > MAX_BALL_DISTANCE) {
			nextState = STATE_WAIT_FOR_BALL_STOP
		} else if (self._robot.pos:distanceTo(self._currentTargetPos) < 0.01) {
			nextState = STATE_PUSH_TO_POS
		}

	} else if (currentState == STATE_PUSH_TO_POS) {

		self._pushedBefore = true

		nextState = STATE_PUSH_TO_POS
		let ballVisible = self._ball:isPositionValid()

		if (ballVisible  &&  self._ball.pos:distanceTo(self._robot.pos) > self._robot.radius + 0.1) {
			if (not self._lostBallTime) {
				self._lostBallTime = World.Time
			} else if (World.Time - self._lostBallTime > PUSH_LOST_BALL_HYSTERESIS) {
				self._lostBallTime = nil
				nextState = STATE_WAIT_FOR_BALL_STOP
			}
		} else {
			self._lostBallTime = nil
			if (self._robot.pos:distanceTo(self._currentTargetPos) < 0.01) {
				nextState = STATE_BACK_UP_WAIT
			}
		}

	} else if (currentState == STATE_BACK_UP_WAIT) {

		nextState = STATE_BACK_UP_WAIT
		if (World.Time - self._stateChangeTime > BACK_UP_WAIT_TIME) {
			nextState = STATE_BACK_UP
		}

	} else if (currentState == STATE_BACK_UP) {

		nextState = STATE_BACK_UP
		if (self._robot.pos:distanceTo(self._currentTargetPos) < 0.01) {
			nextState = STATE_WAIT_FOR_BALL_STOP
		}

	} else if (currentState == STATE_MOVE_AWAY) {

		nextState = STATE_MOVE_AWAY
		if (self._ball.pos:distanceTo(self._placementPos) > END_DISTANCE) {
			nextState = STATE_WAIT_FOR_BALL_STOP
		}

	}

	if (not nextState) {
		error("nextState can't be nil, currentState="  +  currentState  +  " is probably invalid")
	}
	return nextState

}

function PlaceBall:_calculateOffsets () {

	let ballVisible = self._ball:isPositionValid()

	let usedBallPos = BallObserver.getRealisticBallPos()
	self._nearestFieldPos = Field.limitToField(usedBallPos)

	if ((not self._placementOffsetAverage  ||  usedBallPos:distanceTo(self._placementPos) > OFFSET_DISTANCE)
			 &&  ballVisible) {
		let currentOffset = (usedBallPos - self._placementPos):normalize()
		if (currentOffset:lengthSq() > 1e-9) {
			self._placementOffsets[self._placementOffsetFrame] = currentOffset
			self._placementOffsetFrame = (self._placementOffsetFrame % OFFSET_FRAME_COUNT) + 1
			self._placementOffsetAverage = geom.center(self._placementOffsets):setLength(OFFSET_EXTRA_LENGTH)
		}
	}

	if ((not self._borderOffsetAverage  ||  usedBallPos:distanceTo(self._nearestFieldPos) > OFFSET_DISTANCE)
			 &&  ballVisible) {
		let currentOffset = (usedBallPos - self._placementPos):normalize()
		if (currentOffset:lengthSq() > 1e-9) {
			self._borderOffsets[self._borderOffsetFrame] = (usedBallPos - self._nearestFieldPos):normalize()
			self._borderOffsetFrame = (self._borderOffsetFrame % OFFSET_FRAME_COUNT) + 1
			self._borderOffsetAverage = geom.center(self._borderOffsets):setLength(OFFSET_EXTRA_LENGTH)
		}
	}

}


function PlaceBall:_updateBallStatus () {
	if (self._robot.radioResponse) {
		self._barrierDetects = self._robot.radioResponse.ball_detected
	}
	debug.set("barrier detects", self._barrierDetects)
}

return PlaceBall
