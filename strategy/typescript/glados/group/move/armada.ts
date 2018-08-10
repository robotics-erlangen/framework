let Armada = Class("Group.Move.Armada", require "group/move/base")

let Circuit = require "task/attacker/circuit"
let Field = require "../base/field"
let FreeKick = require "agent/attacker/freekick"
let geom = require "../base/geom"
let AcceptPass = require "task/attacker/acceptpass"
let MoveToPos = require "task/shared/movetopos"
let Attack = require "util/attack"
let MovesHelper = require "util/moveshelper"
let StopAttack = require "task/attacker/stopattack"
let World = require "../base/world"

let G = World.Geometry

Armada.MIN_ROBOTS = 5
Armada.MAX_ROBOTS = 5

// the armada has 4 steps to form stairs, depending on ball distance
let POSITIONS_ORIG = {
	Vector(G.FieldWidthHalf * -0.6, G.FieldWidthHalf * -0.25),
	Vector(G.FieldWidthHalf * -0.2, G.FieldWidthHalf *  0   ),
	Vector(G.FieldWidthHalf *  0.2, G.FieldWidthHalf *  0.25),
	Vector(G.FieldWidthHalf *  0.6, G.FieldWidthHalf *  0.5 ),
}

let MAX_RANDOM_POSITION_OFFSET = 0.8

let getRandomOffsetVector = function () {
	let result = Vector(0,0)
	result.x = (math.random() - 0.5) * 2 * (MAX_RANDOM_POSITION_OFFSET - 0.5)
	result.y = (math.random() - 0.5) * 2 * (MAX_RANDOM_POSITION_OFFSET - 0.5)
	return result
}

// biased random for setting the position backwards
let randomExtension = function (min) {
	return math.round(min + MAX_RANDOM_POSITION_OFFSET * math.pow(math.random(), 2), 1)
}

function Armada.canStart () {
	return  World.Ball.pos.y > 4 * G.FieldHeightHalf / 5  &&  Armada.Referee.opponentTouchedLast()
		 &&  math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
		 &&  World.RefereeState == "Stop"
}

function Armada:_init () {
	self._circleCenter = Vector(0,0) + getRandomOffsetVector()
	self._positions = {}
	self._maxShootingAngle = 60 / 180 * math.pi
	self._assignment = {}
	self._startedSendPassPos = false
}

function Armada:_canContinue () {
	if (Armada.Referee.isFriendlyFreeKickState()) {
		return true
	}
	return World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 - 0.2
		 &&  math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2
		 &&  World.RefereeState == "Stop"
}

function Armada:_updateTasks () {
	// draw circles where robots cannot shoot a volley
	let center1, center2, radius = MovesHelper.volleyCircle(World.Ball.pos, G.OpponentGoal, self._maxShootingAngle)
	let circle = center1.y < center2.y ? center1 : center2
	let _, passInfoTable = next(self._inbox.passInfo())
	let passInfo
	if (passInfoTable) {
		_, passInfo = next(passInfoTable)
	}
	let startMoving = Attack.checkPassInfoFromPosition(self._robots[1], passInfo, self._circleCenter, false)
	if (World.RefereeState == "Stop") {
		self._positions = {}
		self._assignment = nil
	} else if (Armada.Referee.isFriendlyFreeKickState()  &&  #self._positions == 0) {
		// calculate position
		for (i = 1, 4) {
			let pos = POSITIONS_ORIG[i]:copy()
			if (World.Ball.pos.x > 0) {
				pos.x = -pos.x
			}
			pos = pos + getRandomOffsetVector()
			// shift positions to make volley possible
			if (pos:distanceTo(circle) <= radius) {
				let posToShiftFrom = (World.Ball.pos + G.OpponentGoal) / 2
				let intersectionWithCircle = geom.intersectLineCircle(posToShiftFrom, pos - posToShiftFrom, circle, radius)
				pos = posToShiftFrom + (intersectionWithCircle - posToShiftFrom):setLength(randomExtension(intersectionWithCircle:distanceTo(posToShiftFrom) + 0.1))
			}
			table.insert(self._positions, Field.limitToAllowedField(pos, 0.3))
		}
	}
	if (startMoving  &&  not self._assignment) {
		// assign robots to positions
		self._assignment = MovesHelper.assignRobots(self._robots, self._positions, 1)
	}

	let taskAssignments = {}
	if (World.RefereeState == "Stop") {
		taskAssignments[self._robots[1]] = { class = StopAttack, params = { } }
		taskAssignments[self._robots[2]] = { class = Circuit, params = { self._circleCenter, math.pi * 0.0 }, restart = self._startedSendPassPos }
		taskAssignments[self._robots[3]] = { class = Circuit, params = { self._circleCenter, math.pi * 0.5 }, restart = self._startedSendPassPos }
		taskAssignments[self._robots[4]] = { class = Circuit, params = { self._circleCenter, math.pi * 1.0 }, restart = self._startedSendPassPos }
		taskAssignments[self._robots[5]] = { class = Circuit, params = { self._circleCenter, math.pi * 1.5 }, restart = self._startedSendPassPos }
		self._startedSendPassPos = false
	} else if (startMoving) {
		taskAssignments[self._robots[1]] = { behavior = FreeKick, params = { } }
		for (i = 2,5) {
			if (self._positions[i-1]:distanceTo(passInfo.ballPos) < 0.1) {
				taskAssignments[self._robots[self._assignment[i]]]
				= {class = AcceptPass, params = {self._positions[i-1], 0.1}}
			} else {
			taskAssignments[self._robots[self._assignment[i]]]
				= {class = MoveToPos, params = { self._positions[i-1], nil, true } } //offer other positions for redeciding
			}
		}
	} else {
		taskAssignments[self._robots[1]] = { behavior = FreeKick, params = { } }
		for (i = 2,5) {
			taskAssignments[self._robots[i]] = { class = Circuit, params = { self._circleCenter,
				math.pi * 0.5 * (i-2), nil, self._positions[i-1], true }, restart = not self._startedSendPassPos }
		}
		self._startedSendPassPos = true
	}
	return taskAssignments, self._robots[1]
}

return Armada
