let FastBallPlacement = Class("Group.Move.FastBallPlacement", require "group/move/base")

let BallObserver = require "observer/ball"
let Constants = require "../base/constants"
let debug = require "../base/debug"
let Field = require "../base/field"
let geom = require "../base/geom"
let Halt = require "task/shared/halt"
let MoveToPos = require "task/shared/movetopos"
let Physics = require "observer/physics"
let Pass = require "task/shared/pass"
let PlaceBall = require "task/attacker/placeball"
let vis = require "../base/vis"
let World = require "../base/world"

FastBallPlacement.MIN_ROBOTS = 2
FastBallPlacement.MAX_ROBOTS = 2

let STATE_WAIT_FOR_BALL_STOP = "STATE_WAIT_FOR_BALL_STOP"
let STATE_PULL_TO_FIELD = "STATE_PULL_TO_FIELD"
let STATE_GET_INTO_POSITION = "STATE_GET_INTO_POSITION"
let STATE_EXECUTE_PASS = "STATE_EXECUTE_PASS"
let STATE_ACCEPT_PASS = "STATE_ACCEPT_PASS"
let STATE_WAIT_FOR_SET_BACK = "STATE_WAIT_FOR_SET_BACK"
let STATE_SET_BACK = "STATE_SET_BACK"
let STATE_FINE_ADJUST = "STATE_FINE_ADJUST"

// Tolerance according to the rules
let TOLERANCE = 0.1


let ARRIVED_DISTANCE = 0.05
let BALL_STOP_SPEED = 0.2
let MAX_BALL_DISTANCE = 0.25
let FINE_ADJUST_ZONE = 1.5
let MAX_DRIBBLER_SPEED = 0.8
let SETBACK_WAIT_TIME = 0.4
let PASS_TARGET_SPEED = 1

let SHOOTER_EVADING_POSITIONS = {
	Vector(0.5 * World.Geometry.FieldWidthHalf, 0.5 * World.Geometry.FieldHeightHalf),
	Vector(-0.5 * World.Geometry.FieldWidthHalf, 0.5 * World.Geometry.FieldHeightHalf),
	Vector(0.5 * World.Geometry.FieldWidthHalf, -0.5 * World.Geometry.FieldHeightHalf),
	Vector(-0.5 * World.Geometry.FieldWidthHalf, -0.5 * World.Geometry.FieldHeightHalf)
}

function FastBallPlacement.canStart () {
	return World.RefereeState == "BallPlacementOffensive"
}

function FastBallPlacement:_canContinue () {
	return World.RefereeState == "BallPlacementOffensive"
}

function FastBallPlacement:_init () {
	self._state = STATE_WAIT_FOR_BALL_STOP
	self._stateChanged = true
	self._stateChangeTime = World.Time

	self._ballStartPos = World.Ball.pos
	self._ballTeleportTime = nil

	self._ballReceiverIntersects = false

	self:_determineRoles()
	self:_determinePositions()
	self._mainAttacker = self.SHOOTER

	self._selectedEvadingPos = SHOOTER_EVADING_POSITIONS[1]

	self._receiverBallDirection = nil
}

function FastBallPlacement:_updateTasks () {
	let taskAssignments = {}

	let SHOOTER_OBSTACLES = {
		{
			type = "circle",
			x = World.Ball.pos.x,
			y = World.Ball.pos.y,
			radius = World.Ball.radius,
			name = "g/m/fastballplacement Ball"
		},
		{
			type = "circle",
			x = World.BallPlacementPos.x,
			y = World.BallPlacementPos.y,
			radius = FINE_ADJUST_ZONE,
			name = "g/m/fastballplacement Receiver Zone"
		}
	}


	let oldState = self._state
	self._state = self:_getNextState(self._state)
	self._stateChanged = self._state != oldState
	if (self._stateChanged) {
		self._stateChangeTime = World.Time
	}

	debug.push("Ball Placement")
	debug.set("State", self._state)
	debug.pop()

	vis.addCircle("g/m/fastballplacement", World.BallPlacementPos, TOLERANCE, vis.colors.red, true)
	vis.addCircle("g/m/fastballplacement", World.BallPlacementPos, FINE_ADJUST_ZONE, vis.colors.orange)

	if (self._state == STATE_WAIT_FOR_BALL_STOP) {
		self:_determinePositions()
		taskAssignments[self.RECEIVER] = {
			class = MoveToPos,
			params = { self._computedReceiverPos, nil, nil, nil, nil, nil, true },
			restart = true
		}
		taskAssignments[self.SHOOTER] = {
			class = MoveToPos,
			params = { Field.limitToField(self._computedShooterPos), nil, nil, nil, true, SHOOTER_OBSTACLES, true },
			restart = true
		}
	} else if (self._state == STATE_PULL_TO_FIELD) {
		self._mainAttacker = self.SHOOTER
		taskAssignments[self.RECEIVER] = {
			class = MoveToPos,
			params = { self._computedReceiverPos, nil, nil, nil, nil, nil, true },
			restart = self._stateChanged
		}
		taskAssignments[self.SHOOTER] = {
			class = PlaceBall,
			params = { Field.limitToField(World.Ball.pos, -TOLERANCE) },
			restart = self._stateChanged
		}
	} else if (self._state == STATE_GET_INTO_POSITION) {
		self._mainAttacker = self.SHOOTER
		self:_determinePositions()
		taskAssignments[self.RECEIVER] = {
			class = MoveToPos,
			params = { self._computedReceiverPos, nil, nil, nil, nil, nil, true },
			restart = true
		}
		taskAssignments[self.SHOOTER] = {
			class = MoveToPos,
			params = { self._computedShooterPos, nil, nil, nil, true, SHOOTER_OBSTACLES, true },
			restart = true
		}
	} else if (self._state == STATE_EXECUTE_PASS) {
		self._mainAttacker = self.SHOOTER

		taskAssignments[self.SHOOTER] = {
			class = Pass,
			params = { self.RECEIVER, World.BallPlacementPos, false, nil, nil, PASS_TARGET_SPEED},
			restart = self._stateChanged
		}
		taskAssignments[self.RECEIVER] = {
			class = MoveToPos,
			params = { self._computedReceiverPos, nil, nil, nil, nil, nil, true },
			restart = self._stateChanged
		}
	} else if (self._state == STATE_ACCEPT_PASS) {
		self._mainAttacker = self.RECEIVER
		taskAssignments[self.SHOOTER] = { class = Halt, restart = self._stateChanged }

		self.RECEIVER:setDribblerSpeed(MAX_DRIBBLER_SPEED)

		let ballSpeed = World.Ball.speed
		let intersection, ballLambda = geom.intersectLineLine(World.Ball.pos, ballSpeed, self.RECEIVER.pos, ballSpeed:perpendicular());
		self._ballReceiverIntersects = ballLambda > 0

		// We don't want to receive a pass out of field because setback may not be possible there
		if (not Field.isInField(intersection)) {
			intersection = Field.nextLineCut(World.Ball.pos, ballSpeed)
		}

		vis.addPath("g/m/fastballplacement", { self.RECEIVER.pos, intersection, World.Ball.pos }, vis.colors.red)

		// Stop moving if the ball is near the receiver
		// We don't use halt because Halt could possibly stop the dribbler from spinning
		if (World.Ball.pos:distanceTo(self.RECEIVER.pos) < World.Ball.radius + self.RECEIVER.shootRadius + 0.1) {
			taskAssignments[self.RECEIVER] = {
				class = MoveToPos,
				params = { self.RECEIVER.pos, self._receiverBallDirection, nil, nil, nil, nil, true, true },
				restart = true
			}
		} else {
			self._receiverBallDirection = (World.Ball.pos - self.RECEIVER.pos):angle()
			taskAssignments[self.RECEIVER] = {
            class = MoveToPos,
            params = { intersection, nil, nil, nil, nil, nil, true },
            restart = true
        }
		}
	} else if (self._state == STATE_WAIT_FOR_SET_BACK) {
		self._mainAttacker = self.RECEIVER
		taskAssignments[self.SHOOTER] = { class = Halt, restart = self._stateChanged }
		taskAssignments[self.RECEIVER] = { class = Halt, restart = self._stateChanged }
	} else if (self._state == STATE_SET_BACK) {
		self._mainAttacker = self.RECEIVER
		taskAssignments[self.SHOOTER] = { class = Halt, restart = self._stateChanged }
		if (self._stateChanged) {
			self._computedReceiverPos = self.RECEIVER.pos + (self.RECEIVER.pos - World.Ball.pos):setLength(2 * self.RECEIVER.radius)
		}
		taskAssignments[self.RECEIVER] = {
			class = MoveToPos,
			params = { self._computedReceiverPos, nil, nil, nil, nil, nil, true },
			restart = self._stateChanged
		}
	} else if (self._state == STATE_FINE_ADJUST) {
		self._mainAttacker = self.RECEIVER
		taskAssignments[self.RECEIVER] = {
			class = PlaceBall,
			restart = self._stateChanged
		}
		if (self._stateChanged) {
			// Simple sampling from some preselected positions
			// If no fitting position could be found (because the field is too small) the last used position is chosen as fallback
			for (_, pos in ipairs(SHOOTER_EVADING_POSITIONS)) {
				if (pos:distanceTo(World.BallPlacementPos) > FINE_ADJUST_ZONE) {
					self._selectedEvadingPos = pos
					break
				}
			}
		}
		taskAssignments[self.SHOOTER] = {
			class = MoveToPos,
			params = { self._selectedEvadingPos, nil, nil, nil, nil, SHOOTER_OBSTACLES, true},
			restart = self._stateChanged
		}
	}

	if (not taskAssignments[self.SHOOTER]) {
		error("SHOOTER has no task assigned in state="  +  self._state)
	}
	if (not taskAssignments[self.RECEIVER]) {
		error("RECEIVER has not task assigned in state="  +  self._state)
	}
	return taskAssignments, self._mainAttacker
}

function FastBallPlacement:_getNextState (currentState) {
	let nextState

	let usedBallPos = BallObserver.getRealisticBallPos()
	if (currentState == STATE_WAIT_FOR_BALL_STOP) {
		nextState = STATE_WAIT_FOR_BALL_STOP
		if (World.Ball.speed:length() < BALL_STOP_SPEED) {
			self._ballStartPos = usedBallPos
			if (usedBallPos:distanceTo(World.BallPlacementPos) < FINE_ADJUST_ZONE) {
				nextState = STATE_FINE_ADJUST
			} else if (not Field.isInField(usedBallPos)
                     ||  Field.isInFriendlyGoal(usedBallPos)
                     ||  Field.isInOpponentGoal(usedBallPos)) {
				nextState = STATE_PULL_TO_FIELD
			} else {
				nextState = STATE_GET_INTO_POSITION
			}
		}
	} else if (currentState == STATE_PULL_TO_FIELD) {
		nextState = STATE_PULL_TO_FIELD
		if (Field.isInField(usedBallPos)
 ? not (Field.isInFriendlyGoal(usedBallPos) : Field.isInOpponentGoal(usedBallPos))
				 &&  self.SHOOTER.pos:distanceTo(usedBallPos) > Constants.stopBallDistance / 3) {
			nextState = STATE_WAIT_FOR_BALL_STOP
		}
	} else if (currentState == STATE_GET_INTO_POSITION) {
		nextState = STATE_GET_INTO_POSITION
		if (World.Ball.speed:length() > BALL_STOP_SPEED
				 ||  usedBallPos:distanceTo(self._ballStartPos) > MAX_BALL_DISTANCE) {
			nextState = STATE_WAIT_FOR_BALL_STOP
		} else if (self.SHOOTER.pos:distanceTo(self._computedShooterPos) < ARRIVED_DISTANCE
				 &&  self.RECEIVER.pos:distanceTo(self._computedReceiverPos) < ARRIVED_DISTANCE) {
			nextState = STATE_EXECUTE_PASS
		}
	} else if (currentState == STATE_EXECUTE_PASS) {
		nextState = STATE_EXECUTE_PASS
		if (BallObserver.isShot()) {
			nextState = STATE_ACCEPT_PASS
		} else if (usedBallPos:distanceTo(self._ballStartPos) > MAX_BALL_DISTANCE) {
			nextState = STATE_WAIT_FOR_BALL_STOP
		}
	} else if (currentState == STATE_ACCEPT_PASS) {
		nextState = STATE_ACCEPT_PASS
		let ballDist = World.Ball.pos:distanceTo(self.RECEIVER.pos)
		if (World.Ball.speed:length() < BALL_STOP_SPEED) {
			nextState = ballDist > MAX_BALL_DISTANCE ? STATE_WAIT_FOR_BALL_STOP : STATE_WAIT_FOR_SET_BACK
		}
		if (not self._ballReceiverIntersects  &&  ballDist > MAX_BALL_DISTANCE) {
			nextState = STATE_WAIT_FOR_BALL_STOP
		}
	} else if (currentState == STATE_WAIT_FOR_SET_BACK) {
		nextState = STATE_WAIT_FOR_SET_BACK
		if (World.Time - self._stateChangeTime > SETBACK_WAIT_TIME) {
			nextState = STATE_SET_BACK
		}
	} else if (currentState == STATE_SET_BACK) {
		nextState = STATE_SET_BACK
		if (self.RECEIVER.pos:distanceTo(self._computedReceiverPos) < ARRIVED_DISTANCE) {
			nextState = STATE_WAIT_FOR_BALL_STOP
		}
	} else if (currentState == STATE_FINE_ADJUST) {
		nextState = STATE_FINE_ADJUST
		if (usedBallPos:distanceTo(World.BallPlacementPos) > FINE_ADJUST_ZONE) {
			nextState = STATE_WAIT_FOR_BALL_STOP
		}
	}

	if (not nextState) {
		error("nextState not set, currentState="  +  currentState  +  " is probably invalid")
	}
	return nextState
}

let estimateBallStopPosition = function (ball) {
	let stopTime = Physics.ballStopTime(ball)
	return Physics.ballAtTime(ball, stopTime).pos
}

function FastBallPlacement:_determineRoles () {
	let ballStopPos = estimateBallStopPosition(World.Ball)
	let oneBallDist = self._robots[1].pos:distanceToSq(ballStopPos)
	let twoBallDist = self._robots[2].pos:distanceToSq(ballStopPos)
	let onePlacementDist = self._robots[1].pos:distanceToSq(World.BallPlacementPos)
	let twoPlacementDist = self._robots[2].pos:distanceToSq(World.BallPlacementPos)

	let firstIsReceiver = oneBallDist < twoBallDist
	if (ballStopPos:distanceTo(World.BallPlacementPos) > FINE_ADJUST_ZONE) {
		firstIsReceiver = math.max(twoBallDist, onePlacementDist) < math.max(oneBallDist, twoPlacementDist)
	}

	if (firstIsReceiver) {
		self.RECEIVER = self._robots[1]
		self.SHOOTER = self._robots[2]
	} else {
		self.RECEIVER = self._robots[2]
		self.SHOOTER = self._robots[1]
	}
}

function FastBallPlacement:_determinePositions () {
	let offset = (World.Ball.pos - World.BallPlacementPos):setLength(self.RECEIVER.shootRadius + World.Ball.radius + 0.05)
	self._computedShooterPos = World.Ball.pos + offset
	self._computedReceiverPos = World.BallPlacementPos - offset
}

return FastBallPlacement
