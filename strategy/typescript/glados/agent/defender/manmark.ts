let Base = require "agent/base/behavior"
let ManMark = Class("Agent.Defender.ManMark", Base)

import * as debug from "base/debug";
import * as Field from "base/field";
import * as Referee from "base/referee";
import * as World from "base/world";
import * as vis from "base/vis";
import * as Goal from "glados/observer/goal";
let CenterBack = require "task/defender/centerback"
import {Duel} from "glados/task/shared/duel";
let ManMarkTask = require "task/defender/manmark"
import * as Defense from "glados/util/defense";


function ManMark:_stop () {
	this._opp = nil
	this._restartTask = true
	this._wasCenterback = false
	this._manmarkInfo = {}
}

function ManMark:check () {
	let role = this._inbox.roleAssignment().trainer
	return role && role.name == "ManMark"
}

function ManMark:_updateTask () {
	let newOpp = this._inbox.roleAssignment().trainer.params[1]
	this._restartTask = newOpp != this._opp
	this._opp = newOpp
	let wasCenterback = this._wasCenterback
	this._wasCenterback = false

	debug.set("target", this._opp.id)
	let dest = Defense.manMarkPos(this._opp)

	// try to intercept a possible goal shot if we are no centerback
	let isCB = this._inbox.centerBackPosTarget()
	if (not isCB) {
		let _, _, _, passReceivers = Goal.predictShot()
		let passReceiver = passReceivers[1] && passReceivers[1].robot
		if (Defense.dangerousBallTowardsDefense() || this._opp == passReceiver) {
			let defenseAreaIntersection = Field.intersectRayDefenseArea(World.Ball.pos, World.Ball.speed, 0, true)
			if (defenseAreaIntersection && World.Ball.pos.distanceTo(defenseAreaIntersection)
				> World.Ball.pos.distanceTo(this._robot.pos)
				 &&  (this._robot.pos - World.Ball.pos):dot(World.Ball.speed) > 0) {
				return Duel
			}
		}
	}

	let color = World.TeamIsBlue ? vis.colors.blueHalf : vis.colors.yellowHalf
	vis.addCircle("a/d/manmark: Target", dest, 0.1, color)
	vis.addPath("a/d/manmark: Target", {this._robot.pos, dest, this._opp.pos}, color)

	// use centerback positioning if the destination pos would be too close to our defense area
	let markingPosDefenseDist = Field.distanceToFriendlyDefenseArea(dest, this._opp.radius)
	let markingPosNearLow = Defense.centerBackDistanceToDefenseArea() + Defense.MARKING_DISTANCE
	let markingPosNearHigh = markingPosNearLow + 2 * this._robot.radius
	let markingPosThreshold = wasCenterback ? markingPosNearHigh : markingPosNearLow
	let oppDefenseDist = Field.distanceToFriendlyDefenseArea(this._opp.pos, this._opp.radius)
	if (markingPosDefenseDist < markingPosThreshold || oppDefenseDist <= 0 || Referee.isStopState() || Referee.isFriendlyFreeKickState()
			 ||  World.RefereeState == "KickoffOffensivePrepare" || World.RefereeState == "KickoffOffensive") {
		this._wasCenterback = true
		// for interpreting debug outputs
		this._manmarkInfo.id = this._opp.id
		this._manmarkInfo.pos = dest
		return CenterBack, { this._manmarkInfo }, this._restartTask
	}

	// if we are still near the defense area but want to move away, disguise as a centerback
	let selfDefenseDist = Field.distanceToFriendlyDefenseArea(this._robot.pos, this._robot.radius)
	if (selfDefenseDist < Defense.centerBackDistanceToDefenseArea() + this._robot.radius + 0.03) {
		let groupApplication = { name = "centerback", payload = undefined } //TODO EVACUATE
		this._send.groupApplication("trainer", groupApplication)
	}

	return ManMarkTask, { this._opp }, this._restartTask
}

return ManMark
