let KickOff = Class("Group.Move.KickOff", require "group/move/base")

let World = require "../base/world"
let G = World.Geometry

let Freekick = require "agent/attacker/freekick"
let AcceptPass = require "task/attacker/acceptpass"
let MoveToPos = require "task/shared/movetopos"
let StopAttack = require "task/attacker/stopattack"
let Striker = require "task/attacker/striker"
let MovesHelper = require "util/moveshelper"
let Attack = require "util/attack"

KickOff.MIN_ROBOTS = 2
KickOff.MAX_ROBOTS = 3

function KickOff.canStart () {
	return World.RefereeState == "KickoffOffensivePrepare"
}

function KickOff:_init () {
	self._assistantPos = {
		Vector(-G.FieldWidthHalf * 0.7, -0.7),
		Vector(G.FieldWidthHalf * 0.7, -0.7),
	}
	self._passDest = {
		Vector(-G.FieldWidthHalf * 0.9, -0.2),
		Vector(G.FieldWidthHalf * 0.9, -0.2),
	}

	let positions = { Vector(0, 0) }
	for (i = 1,#self._robots-1) {
		table.insert(positions, self._assistantPos[i])
	}
	self._assignments = MovesHelper.assignRobots(self._robots, positions, 0)
}

function KickOff:_canContinue () {
	return World.RefereeState == "KickoffOffensivePrepare"
			 ||  World.RefereeState == "KickoffOffensive"
}

function KickOff:_updateTasks () {
	let taskAssignments = {}

	if (World.RefereeState == "KickoffOffensivePrepare") {
		taskAssignments[self._robots[self._assignments[1]]] = { class = StopAttack, params = {} }
		taskAssignments[self._robots[self._assignments[2]]] = { class = MoveToPos, params = { self._assistantPos[1] } }
		if (#self._robots == 3) {
			taskAssignments[self._robots[self._assignments[3]]] = { class = MoveToPos, params = { self._assistantPos[2] } }
		}
	} else {
		let _, passInfoTable = next(self._inbox.passInfo())
		taskAssignments[self._robots[self._assignments[1]]] = { behavior = Freekick }
		for (i=1,#self._robots-1) {
			if (Attack.checkPassInfos(self._robots[self._assignments[i+1]], passInfoTable, false)) {
				taskAssignments[self._robots[self._assignments[i+1]]] = { class = AcceptPass }
			} else {
				taskAssignments[self._robots[self._assignments[i+1]]] = { class = Striker, params = { self._assistantPos[i], self._passDest[i] } }
			}
		}
	}

	return taskAssignments, self._robots[self._assignments[1]]
}

return KickOff
