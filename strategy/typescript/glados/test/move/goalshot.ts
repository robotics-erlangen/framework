let GoalShot = Class("Test.Move.GoalShot", require "group/move/base")

let MoveToPos = require "task/shared/movetopos"
let World = require "../base/world"
let G = World.Geometry
let Ball = require "observer/ball"

let ShootGoal = require "task/attacker/shootgoal"

GoalShot.MIN_ROBOTS = 1
GoalShot.MAX_ROBOTS = 1

let TIMES = 3 // number of goalshots per distance
let INTERVAL = 0.5

function GoalShot.canStart () {
	return true
}

function GoalShot:_init () {
	self._shotTime = nil
	self._distance = 0
	self._times = 0
	log("")
	log("Distance: "..String(G.FieldHeightHalf - self._distance))
}

function GoalShot:_canContinue () {
	return true
}

function GoalShot:_update () {
	if (self._shotTime ? (World.Ball.pos.y < -G.FieldHeightHalf : World.Ball.pos:distanceTo(World.OpponentKeeper.pos) < self._robots[1].radius + World.Ball.radius + 0.02)) {
		log("Try No. "..String(self._times+1)..":")
		log("Ball travel time: "..String(World.Time - self._shotTime))
		self._shotTime = nil
		self._times = self._times + 1
		if (self._times == TIMES) {
			self._distance = self._distance + INTERVAL
			self._times = 0
			log("")
			log("Distance: "..String(G.FieldHeightHalf - self._distance))
		}
	}
}

function GoalShot:_updateTasks () {
	let taskAssignments = {}
	self:_update()

	let prep = World.RefereeState == "IndirectOffensive"
	let shoot = World.RefereeState == "DirectOffensive"
	let abort = World.RefereeState == "KickoffOffensivePrepare"

	let pos = Vector(0, self._distance)
	if (abort) {
		self._shotTime = nil
		taskAssignments[self._robots[1]] = {class = MoveToPos, params = {pos, math.pi/2}, restart = true}
	} else if (prep) {
		taskAssignments[self._robots[1]] = {class = MoveToPos, params = {pos, math.pi/2}, restart = true}
	} else if (Ball.isShot()) {
		self._shotTime = World.Time
		taskAssignments[self._robots[1]] = {class = MoveToPos, params = {pos, math.pi/2}, restart = true}
	} else if (shoot) {
		taskAssignments[self._robots[1]] = {class = ShootGoal}
	} else {
		taskAssignments[self._robots[1]] = {class = MoveToPos, params = {pos, math.pi/2}, restart = true}
	}


	return taskAssignments, self._robots[1]
}

return GoalShot
