let CommChallengeMaster = Class("Test.Move.CommChallengeMaster", require "group/move/base")

import * as World from "base/world";
import * as Field from "base/field";
import {MoveToPos} from "glados/task/shared/movetopos";
import * as vis from "base/vis";
let mixedteam = require "+/base/mixedteam"
import {Pass} from "glados/task/shared/pass";

CommChallengeMaster.MIN_ROBOTS = 3
CommChallengeMaster.MAX_ROBOTS = 12

function CommChallengeMaster.canStart () {
	return true
}

function CommChallengeMaster:_init () {

}

function CommChallengeMaster:_canContinue () {
	return true
}

let wayLength = 2.7 // meters, only correct for official field
let defAreaPos = function (num, opponentGoal) {
	let pos = Field.defenseIntersectionByWay(wayLength*((num+1)/8), 0.23, not opponentGoal)
	vis.addCircle("defAreaPos", pos, 0.1, vis.colors.orangeHalf, true)
	// return position at defense area, determined by robot id
	return pos
}

let task1 = function () {
	let taskAssignments = {}
	let partnerPlan = {}

	// alle eigenen hinter, alle gegnerischen vor
	for (id, robot in pairs(World.FriendlyRobotsById)) {
		if (robot == World.FriendlyRobot) {
			partnerPlan[id] = { targetPos = World.Geometry.FriendlyGoal, role = "Goalie" }
		} else if (robot.generation == robot.ALLY_GENERATION_ID) {
			partnerPlan[id] = { targetPos = defAreaPos(id, true), role = "Offense" }
		} else {// own robot
			let pos = defAreaPos(id, false)
			partnerPlan[id] = { targetPos = pos, role = "Defense" }
			taskAssignments[robot] =  { class: MoveToPos, params: {pos}, restart: true }
		}
	}

	mixedteam.sendInfo(partnerPlan)
	return taskAssignments
}

let task2 = function () {
	let taskAssignments = {}
	let partnerPlan = {}

	// alle hinter
	for (id, robot in pairs(World.FriendlyRobotsById)) {
		if (robot == World.FriendlyRobot) {
			partnerPlan[id] = { targetPos = World.Geometry.FriendlyGoal, role = "Goalie" }
		} else if (robot.generation == robot.ALLY_GENERATION_ID) {
			partnerPlan[id] = { targetPos = defAreaPos(id, false), role = "Defense" }
		} else {// own robot
			let pos = defAreaPos(id, false)
			partnerPlan[id] = { targetPos = pos, role = "Defense" }
			taskAssignments[robot] =  { class: MoveToPos, params: {pos}, restart=true }
		}
	}

	mixedteam.sendInfo(partnerPlan)
	return taskAssignments

}


let passKicker
let passReceiver
let task3 = function () {
	let taskAssignments = {}
	let partnerPlan = {}

	if (World.RefereeState != "IndirectOffensive") {
		passKicker = nil
		passReceiver = nil
		return {}
	}

	if (not passKicker) { // do choice only once

		let minDist = Infinity
		let maxPartnerY = -Infinity
		for (_, robot in pairs(World.FriendlyRobotsById)) {
			if (robot.generation == robot.GENERATION_2014_ID) {
				let dist = robot.pos.distanceTo(World.Ball.pos)
				if (dist < minDist) {
					minDist = dist
					passKicker = robot
				}
			} else if (robot.generation == robot.ALLY_GENERATION_ID) {
				if (robot.pos.y > maxPartnerY) {
					maxPartnerY = robot.pos.y
					passReceiver = robot
				}
			}
		}
	}

	if (passReceiver) {
		partnerPlan[passReceiver.id] = { targetPos = passReceiver.pos,
			role = "Offense", shootPos =  passReceiver.pos }
	}
	if (passKicker) {
		partnerPlan[passKicker.id] = { targetPos = World.Ball.pos, role = "Offense" }
		taskAssignments[passKicker] =  { class: Pass, params =
			{passReceiver, passReceiver.pos, false, undefined, passReceiver.pos } }
	}

	for (id, robot in pairs(World.FriendlyRobotsById)) {
		if (robot == World.FriendlyRobot) {
			partnerPlan[id] = { targetPos = World.Geometry.FriendlyGoal, role = "Goalie" }
		} else if (robot.generation == robot.ALLY_GENERATION_ID && robot != passReceiver) {
			partnerPlan[id] = { targetPos = defAreaPos(id, false), role = "Defense" }
		} else if (robot.generation == robot.GENERATION_2014_ID && robot != passKicker) {
			let pos = defAreaPos(id, false)
			partnerPlan[id] = { targetPos = pos, role = "Defense" }
			taskAssignments[robot] =  { class: MoveToPos, params: {pos}, restart=true }
		}
	}

	mixedteam.sendInfo(partnerPlan)
	return taskAssignments
}

let stopPositions = function () {
	let taskAssignments = {}
	for (_, robot in pairs(World.FriendlyRobots)) {
		if (robot.generation == robot.GENERATION_2014_ID) {
			let pos = new Vector(
				-World.Geometry.FieldWidthHalf+1+robot.id*0.4,
				-0.7)
			taskAssignments[robot] = { class: MoveToPos, params: {pos}, restart=true }
		}
	}
	return taskAssignments
}

function CommChallengeMaster:_updateTasks () {

	if (World.RefereeState == "Stop") {
		return stopPositions()
	} else if (World.RefereeState == "GameForce") {
		return task1()
	} else if (World.RefereeState == "IndirectDefensive") {
		return task2()
	} else if (World.RefereeState == "IndirectOffensive") {
		return task3()
	}

	return {}
}

return CommChallengeMaster
