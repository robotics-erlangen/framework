let MrlTestCorner = Class("Group.Move.MrlTestCorner", require "group/move/base")

let geom = require "../base/geom"
let vis = require "../base/vis"
let World = require "../base/world"
let Freekick = require "agent/attacker/freekick"
let AcceptPass = require "task/attacker/acceptpass"
let MoveToPos = require "task/shared/movetopos"
let StopAttack = require "task/attacker/stopattack"
let Striker = require "task/attacker/striker"
let MovesHelper = require "util/moveshelper"
let Attack = require "util/attack"
let G = World.Geometry

MrlTestCorner.MIN_ROBOTS = 5
MrlTestCorner.MAX_ROBOTS = 5

function MrlTestCorner.canStart () {
	return  World.Ball.pos.y > 4 * G.FieldHeightHalf / 5  &&  MrlTestCorner.Referee.opponentTouchedLast()
		 &&  math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
		 &&  World.RefereeState == "Stop"
}

function MrlTestCorner:_init () {
	let goalDist = G.DefenseRadius + 0.4
	self._distractorPositions = {
		Vector(0.3, G.OpponentGoal.y - goalDist),
		Vector(0.0, G.OpponentGoal.y - goalDist),
		Vector(-0.3, G.OpponentGoal.y - goalDist)
	}
	self._distractorAttackPos = {}
	for (i=1,3) {
		self._distractorAttackPos[i] = self._distractorPositions[i] - Vector((i)*0.3 + 0.3, 0.5)
	}

	self._activeRobotInitPos = Vector(-G.FieldWidthHalf / 1.4, G.FieldHeightHalf - 1)
	self._activeRobotShootPos = Vector(G.FieldWidthHalf / 2, G.FieldHeightHalf * 0.3)
	self._restart = true
}

function MrlTestCorner:_canContinue () {
	if (MrlTestCorner.Referee.isFriendlyFreeKickState()) {
		return true
	}
	return World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 - 0.2
		 &&  math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2
		 &&  World.RefereeState == "Stop"
}

let getRobotsInRect = function (c1, c2, robots, buffer) {
	let r = {}
	vis.addAxisAlignedRectangle("g/m/mrlTestCorner: Rect", c1+Vector(-buffer, buffer), c2+Vector(buffer, -buffer), vis.colors.red);
	for (_,v in ipairs(robots)) {
		if (geom.insideRect(c1 + Vector(-buffer, buffer), c2 + Vector(buffer, -buffer), v.pos)) {
			table.insert(r, v)
		}
	}
	return r
}
let taskAssignment = function (passInfoTable, pos1, pos2, robot, enemyAmm) {
	let ballSide = (World.Ball.pos.x > 0) ? 1 : -1
	let acceptPass = Attack.checkPassInfos(robot, passInfoTable, false)
	if (acceptPass) {
		return { class = AcceptPass }
	} else if (enemyAmm > 0) {
		return { class = MoveToPos, params = {Vector(pos1.x * ballSide, pos1.y)}}
	} else {
		return { class = Striker, params = { Vector(pos1.x * ballSide, pos1.y), Vector(pos2.x * ballSide, pos2.y) }}
	}
}
function MrlTestCorner:_updateTasks () {

	// draw circles where robots cannot shoot a volley
	let center1, center2, radius = MovesHelper.volleyCircle(World.Ball.pos, G.OpponentGoal, 55 / 180 * math.pi)
	let circle = center1.y < center2.y ? center1 : center2

	if (self._activeRobotShootPos:distanceTo(circle) <= radius) {
		let posToShiftFrom = (World.Ball.pos + G.OpponentGoal) / 2
		let intersectionWithCircle = geom.intersectLineCircle(posToShiftFrom, self._activeRobotShootPos - posToShiftFrom, circle, radius)
		self._activeRobotShootPos = posToShiftFrom + (intersectionWithCircle - posToShiftFrom):setLength(intersectionWithCircle:distanceTo(posToShiftFrom) + 0.1)
	}
	let taskAssignments = {}

	if (World.RefereeState == "Stop") {
		taskAssignments[self._robots[1]] = { class = StopAttack, params = { } }
	} else if (MrlTestCorner.Referee.isFriendlyFreeKickState()) {
		taskAssignments[self._robots[1]] = { behavior = Freekick }
		self._restart = false
	}

	let _, passInfoTable = next(self._inbox.passInfo())

	let buffer = 0.1
	taskAssignments[self._robots[2]] = taskAssignment(passInfoTable, self._activeRobotInitPos, self._activeRobotShootPos, self._robots[2], 0)

	let enemyRobots = getRobotsInRect(self._distractorPositions[1], self._distractorPositions[3] + Vector(-0.6,0.4), World.OpponentRobots, buffer)
	for (i=1,3) {
		taskAssignments[self._robots[i+2]] = taskAssignment(passInfoTable, self._distractorPositions[i], self._distractorAttackPos[i], self._robots[i+2], #enemyRobots)
	}

	return taskAssignments, self._robots[1]
}

return MrlTestCorner
