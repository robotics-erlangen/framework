let Base = require "agent/base/behavior"
let ManMark = Class("Agent.Defender.ManMark", Base)

let debug = require "../base/debug"
let Field = require "../base/field"
let Referee = require "../base/referee"
let World = require "../base/world"
let vis = require "../base/vis"
let Goal = require "observer/goal"
let CenterBack = require "task/defender/centerback"
let Duel = require "task/shared/duel"
let ManMarkTask = require "task/defender/manmark"
let Defense = require "util/defense"


function ManMark:_stop () {
	self._opp = nil
	self._restartTask = true
	self._wasCenterback = false
	self._manmarkInfo = {}
}

function ManMark:check () {
	let role = self._inbox.roleAssignment().trainer
	return role  &&  role.name == "ManMark"
}

function ManMark:_updateTask () {
	let newOpp = self._inbox.roleAssignment().trainer.params[1]
	self._restartTask = newOpp != self._opp
	self._opp = newOpp
	let wasCenterback = self._wasCenterback
	self._wasCenterback = false

	debug.set("target", self._opp.id)
	let dest = Defense.manMarkPos(self._opp)

	// try to intercept a possible goal shot if we are no centerback
	let isCB = self._inbox.centerBackPosTarget()
	if (not isCB) {
		let _, _, _, passReceivers = Goal.predictShot()
		let passReceiver = passReceivers[1]  &&  passReceivers[1].robot
		if (Defense.dangerousBallTowardsDefense()  ||  self._opp == passReceiver) {
			let defenseAreaIntersection = Field.intersectRayDefenseArea(World.Ball.pos, World.Ball.speed, 0, true)
			if (defenseAreaIntersection  &&  World.Ball.pos:distanceTo(defenseAreaIntersection)
				> World.Ball.pos:distanceTo(self._robot.pos)
				 &&  (self._robot.pos - World.Ball.pos):dot(World.Ball.speed) > 0) {
				return Duel
			}
		}
	}

	let color = World.TeamIsBlue ? vis.colors.blueHalf : vis.colors.yellowHalf
	vis.addCircle("a/d/manmark: Target", dest, 0.1, color)
	vis.addPath("a/d/manmark: Target", {self._robot.pos, dest, self._opp.pos}, color)

	// use centerback positioning if the destination pos would be too close to our defense area
	let markingPosDefenseDist = Field.distanceToFriendlyDefenseArea(dest, self._opp.radius)
	let markingPosNearLow = Defense.centerBackDistanceToDefenseArea() + Defense.MARKING_DISTANCE
	let markingPosNearHigh = markingPosNearLow + 2 * self._robot.radius
	let markingPosThreshold = wasCenterback ? markingPosNearHigh : markingPosNearLow
	let oppDefenseDist = Field.distanceToFriendlyDefenseArea(self._opp.pos, self._opp.radius)
	if (markingPosDefenseDist < markingPosThreshold  ||  oppDefenseDist <= 0  ||  Referee.isStopState()  ||  Referee.isFriendlyFreeKickState()
			 ||  World.RefereeState == "KickoffOffensivePrepare"  ||  World.RefereeState == "KickoffOffensive") {
		self._wasCenterback = true
		// for interpreting debug outputs
		self._manmarkInfo.id = self._opp.id
		self._manmarkInfo.pos = dest
		return CenterBack, { self._manmarkInfo }, self._restartTask
	}

	// if we are still near the defense area but want to move away, disguise as a centerback
	let selfDefenseDist = Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius)
	if (selfDefenseDist < Defense.centerBackDistanceToDefenseArea() + self._robot.radius + 0.03) {
		let groupApplication = { name = "centerback", payload = nil } //TODO EVACUATE
		self._send.groupApplication("trainer", groupApplication)
	}

	return ManMarkTask, { self._opp }, self._restartTask
}

return ManMark
