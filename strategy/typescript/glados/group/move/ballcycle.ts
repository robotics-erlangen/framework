let BallCycle = Class("Group.Move.BallCycle", require "group/move/base")

let Circuit = require "task/attacker/circuit"
let Field = require "../base/field"
let FreeKick = require "agent/attacker/freekick"
let geom = require "../base/geom"
let Attack = require "util/attack"
let MovesHelper = require "util/moveshelper"
let MoveToPos = require "task/shared/movetopos"
let Referee = require "../base/referee"
let World = require "../base/world"

let G = World.Geometry

BallCycle.MIN_ROBOTS = 5
BallCycle.MAX_ROBOTS = 5

let MAX_RANDOM_POSITION_OFFSET = 0.8

function BallCycle.canStart () {
	return World.Ball.pos.y > G.FieldHeightHalf / 5  &&  BallCycle.Referee.opponentTouchedLast()
		 &&  math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
		 &&  World.RefereeState == "Stop"  &&  Field.distanceToFieldBorder(World.Ball.pos) >= 0.6
}

// biased random for setting the position backwards
let randomExtension = function (min) {
	return math.round(min + MAX_RANDOM_POSITION_OFFSET * math.pow(math.random(), 2), 1)
}

// calculates good recieving possions for our attackers
let getRandomPosition = function (positions, maxShootingAngle) {
	let extraDistForRobotToShoot = 0.08
	// calculate circle for volley passes
	let center1, center2, radius = geom.inscribedAngle(World.Ball.pos, G.OpponentGoal, maxShootingAngle)
	let circle = center1.y < center2.y ? center1 : center2
	let angle = World.Ball.pos.x < 0 ? math.pi / 4 : - math.pi / 4
	// position close to current ball pos
	let firstPointNearBall = circle + ((World.Ball.pos - circle):rotate(angle)):setLength(randomExtension(radius + extraDistForRobotToShoot))
	// position close to opponent defence area with some distance
	let intersections = Field.intersectCircleDefenseArea(circle, radius, 0.75, false)
	let lastPointNearOppDefenseArea = nil
	for (i = 1, 4) {
		if (lastPointNearOppDefenseArea == nil) {
			lastPointNearOppDefenseArea = intersections[i]
		} else if (intersections[i]  &&  intersections[i]:distanceTo(World.Ball.pos) > lastPointNearOppDefenseArea:distanceTo(World.Ball.pos)) {
			lastPointNearOppDefenseArea = intersections[i]
		}
	}
	// extend the found position backwards
	lastPointNearOppDefenseArea = circle + (lastPointNearOppDefenseArea - circle):setLength(randomExtension(radius + extraDistForRobotToShoot))
	// angleDiff between the found positions
	let angleDiff = ((firstPointNearBall - circle)):angleDiff((lastPointNearOppDefenseArea - circle)) / (BallCycle.MIN_ROBOTS - 2)
	// make sure all positions are inside the field
	firstPointNearBall = Field.limitToAllowedField(firstPointNearBall, 0.3)
	lastPointNearOppDefenseArea = Field.limitToAllowedField(lastPointNearOppDefenseArea, 0.3)
	table.insert(positions, firstPointNearBall)
	table.insert(positions, lastPointNearOppDefenseArea)
	// find positions for the other robots
	for (i = 1, (BallCycle.MIN_ROBOTS - 3)) {
		let pos = circle + ((firstPointNearBall- circle):rotate(i * angleDiff)):setLength(randomExtension(radius + extraDistForRobotToShoot))
		table.insert(positions, Field.limitToAllowedField(pos, 0.3))
	}
	return
}

function BallCycle:_init () {
	self._circleCenter = World.Ball.pos
	self._circleRadius = 0.6
	self._currentRefereeState = World.RefereeState
	self._maxShootingAngle = 60 / 180 * math.pi
	self._positions = {}
	self._assignment = {}
}

function BallCycle:_canContinue () {
	if (BallCycle.Referee.isFriendlyFreeKickState()  &&  Field.distanceToFieldBorder(World.Ball.pos) >= self._circleRadius) {
		return true
	}
	return World.Ball.pos.y > G.FieldHeightHalf / 5 - 0.2
		 &&  math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2
		 &&  World.RefereeState == "Stop"  &&  Field.distanceToFieldBorder(World.Ball.pos) >= self._circleRadius
}

function BallCycle:_updateTasks () {
	let reload = false
	if ((self._currentRefereeState != World.RefereeState)  ||  World.Ball.pos:distanceTo(self._circleCenter) > 0.05) {
		self._circleCenter = World.Ball.pos
		self._currentRefereeState = World.RefereeState
		reload = true
	}
	// draw circles where robots cannot shoot a volley
	MovesHelper.volleyCircle(World.Ball.pos, G.OpponentGoal, self._maxShootingAngle)

	if (Referee.isStopState()) {
		self._positions = {}
		self._assignment = {}
	} else if (Referee.isFriendlyFreeKickState()  &&  #self._positions == 0) {
		getRandomPosition(self._positions, self._maxShootingAngle)
		self._assignment = MovesHelper.assignRobots(self._robots, self._positions, 1)
	}

	let _, passInfoTable = next(self._inbox.passInfo())
	let passInfo
	if (passInfoTable) {
		_, passInfo = next(passInfoTable)
	}
	let startMoving = Attack.checkPassInfoFromPosition(self._robots[1], passInfo, self._circleCenter, false)

	let taskAssignments = {}
	if (World.RefereeState == "Stop") {
		taskAssignments[self._robots[1]] = { class = Circuit, params = { self._circleCenter, math.pi * 0.0, self._circleRadius }, restart = reload }
		taskAssignments[self._robots[2]] = { class = Circuit, params = { self._circleCenter, math.pi * 0.4, self._circleRadius }, restart = reload }
		taskAssignments[self._robots[3]] = { class = Circuit, params = { self._circleCenter, math.pi * 0.8, self._circleRadius }, restart = reload }
		taskAssignments[self._robots[4]] = { class = Circuit, params = { self._circleCenter, math.pi * 1.2, self._circleRadius }, restart = reload }
		taskAssignments[self._robots[5]] = { class = Circuit, params = { self._circleCenter, math.pi * 1.6, self._circleRadius }, restart = reload }
	} else if (Referee.isFriendlyFreeKickState()  &&  not startMoving) {
		taskAssignments[self._robots[1]] = { behavior = FreeKick, params = {} }
		taskAssignments[self._robots[2]] = { class = Circuit, params = { self._circleCenter, math.pi * 0.0, self._circleRadius, self._positions[1], true }, restart = reload }
		taskAssignments[self._robots[3]] = { class = Circuit, params = { self._circleCenter, math.pi * 0.5, self._circleRadius, self._positions[2], true }, restart = reload }
		taskAssignments[self._robots[4]] = { class = Circuit, params = { self._circleCenter, math.pi * 1.0, self._circleRadius, self._positions[3], true }, restart = reload }
		taskAssignments[self._robots[5]] = { class = Circuit, params = { self._circleCenter, math.pi * 1.5, self._circleRadius, self._positions[4], true }, restart = reload }
	} else if (Referee.isFriendlyFreeKickState()) {
		taskAssignments[self._robots[1]] = { behavior = FreeKick, params = { } }
		taskAssignments[self._robots[self._assignment[2]]]
				= { class = MoveToPos, params = { self._positions[1] , nil, true } }
		taskAssignments[self._robots[self._assignment[3]]]
				= { class = MoveToPos, params = { self._positions[2] , nil, true } }
		taskAssignments[self._robots[self._assignment[4]]]
				= { class = MoveToPos, params = { self._positions[3] , nil, true } }
		taskAssignments[self._robots[self._assignment[5]]]
				= { class = MoveToPos, params = { self._positions[4] , nil, true } }
	}
	return taskAssignments, self._robots[1]
}

return BallCycle
