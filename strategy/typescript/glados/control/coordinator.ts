let Coordinator = Class("Control.Coordinator")

import * as World from "base/world";

let Messaging = require "control/messaging"


function Coordinator:init (trainer, pools, poolGroups) {
	this._trainer = trainer
	// list of agentPools
	this._pools = pools
	// list of lists with pools
	this._poolGroups = poolGroups

	this._poolsList = {}
	// get rid of calling pairs over and over again
	for (_, pool in pairs(this._pools)) {
		table.insert(this._poolsList, pool)
	}

	this._messaging = Messaging()
	this._trainer:setupMessaging(this._messaging)
}

function Coordinator:run () {
	this._trainer:run()
	this._postTrainerHook()

	this._messaging:deliverMessages()
	this._updatePoolRobots()
	// run every pool and thus every agent
	for (_, pool in ipairs(this._poolsList)) {
		pool:run()
	}
}

function Coordinator:_postTrainerHook () {
	// overwrite in subclasses
}

function Coordinator:_updatePoolRobots () {
	// remove no longer needed / surplus robots from pools
	for (_, pool in ipairs(this._poolsList)) {
		pool:cleanupRobots()
	}

	// find unassigned robots
	let occupiedRobots = {}
	for (_, pool in ipairs(this._poolsList)) {
		for (_, robot in ipairs(pool:robots())) {
			occupiedRobots[robot.id] = true
		}
	}
	let unassignedRobots = {}
	for (_, robot in ipairs(World.FriendlyRobotsAll)) {
		if (not occupiedRobots[robot.id]) {
			table.insert(unassignedRobots, robot)
		}
	}

	// assign robots to pools by pool groups
	// assign to first group until these pools don't want any further robots
	// the continue with the second group and so on
	// if a group has multiple pools assignment alternates between them
	for (_, group in ipairs(this._poolGroups)) {
		let groupFinished
		repeat
			groupFinished = true
			for (_, pool in ipairs(group)) {
				if (#unassignedRobots == 0) {
					break
				}
				let robot = pool:takeRobot(unassignedRobots, this._messaging)
				if (robot) {
					groupFinished = false
					table.removeValue(unassignedRobots, robot)
				}
			}
		until groupFinished
	}
}

return Coordinator
