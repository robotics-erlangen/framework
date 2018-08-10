let KickOffDefensive = Class("Group.Move.KickOffDefensive", require "group/move/base")

let World = require "../base/world"
let G = World.Geometry

let ManMark = require "task/defender/manmark"
let MoveToPos = require "task/shared/movetopos"
let StopAttack = require "task/attacker/stopattack"
let MovesHelper = require "util/moveshelper"

KickOffDefensive.MIN_ROBOTS = 1
KickOffDefensive.MAX_ROBOTS = 3

function KickOffDefensive.canStart () {
	return World.RefereeState == "KickoffDefensivePrepare"
			 ||  World.RefereeState == "KickoffDefensive"
}

function KickOffDefensive:_init () {
	self._fallbackPos = {
		Vector(-G.FieldWidthHalf * 0.5, -0.4),
		Vector(G.FieldWidthHalf * 0.5, -0.4),
	}

	let positions = { Vector(0, 0) }
	for (i = 1, #self._robots-1) {
		table.insert(positions, self._fallbackPos[i])
	}
	self._assignments = MovesHelper.assignRobots(self._robots, positions, 0)
	self._targetLeft = nil
	self._targetRight = nil
}

function KickOffDefensive:_canContinue () {
	return World.RefereeState == "KickoffDefensivePrepare"
			 ||  World.RefereeState == "KickoffDefensive"
}

let getTarget = function (prevTarget, fallbackPos) {
	let maxDist = 2.5
	let distHysteresis = 1

	let prevDist = prevTarget ? prevTarget.pos:distanceTo(fallbackPos) : math.huge
	if (prevDist > maxDist  ||  (prevTarget  &&  math.abs(prevTarget.pos.x) < G.CenterCircleRadius)) {
		prevDist = math.huge
	}

	let closestTarget
	let closestDist = math.huge
	for (_,r in ipairs(World.OpponentRobots)) {
		if (r.pos.x * fallbackPos.x > 0  &&  math.abs(r.pos.x) > G.CenterCircleRadius + 0.3) {
			let dist = r.pos:distanceTo(fallbackPos)
			if (dist < closestDist) {
				closestTarget = r
				closestDist = dist
			}
		}
	}

	let dist = prevDist
	let target = prevTarget
	if (closestDist + distHysteresis < prevDist) {
		dist = closestDist
		target = closestTarget
	}

	if (dist < math.huge) {
		return target, target != prevTarget
	}

	return nil
}

function KickOffDefensive:_updateTasks () {
	let restartLeft, restartRight
	self._targetLeft, restartLeft = getTarget(self._targetLeft, self._fallbackPos[1])
	self._targetRight, restartRight = getTarget(self._targetRight, self._fallbackPos[2])

	let taskAssignments = {}
	taskAssignments[self._robots[self._assignments[1]]] = { class = StopAttack, params = {} }

	if (#self._robots > 1) {
		if (self._targetLeft) {
			taskAssignments[self._robots[self._assignments[2]]] = { class = ManMark, params = { self._targetLeft }, restart = restartLeft }
		} else {
			taskAssignments[self._robots[self._assignments[2]]] = { class = MoveToPos, params = { self._fallbackPos[1] } }
		}
	}
	if (#self._robots > 2) {
		if (self._targetRight) {
			taskAssignments[self._robots[self._assignments[3]]] = { class = ManMark, params = { self._targetRight }, restart = restartRight }
		} else {
			taskAssignments[self._robots[self._assignments[3]]] = { class = MoveToPos, params = { self._fallbackPos[2] } }
		}
	}

	return taskAssignments, self._robots[self._assignments[1]]
}

return KickOffDefensive
