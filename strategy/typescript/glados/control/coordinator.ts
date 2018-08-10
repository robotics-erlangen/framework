let Coordinator = Class("Control.Coordinator")

let World = require "../base/world"

let Messaging = require "control/messaging"


function Coordinator:init (trainer, pools, poolGroups) {
	self._trainer = trainer
	// list of agentPools
	self._pools = pools
	// list of lists with pools
	self._poolGroups = poolGroups

	self._poolsList = {}
	// get rid of calling pairs over and over again
	for (_, pool in pairs(self._pools)) {
		table.insert(self._poolsList, pool)
	}

	self._messaging = Messaging()
	self._trainer:setupMessaging(self._messaging)
}

function Coordinator:run () {
	self._trainer:run()
	self:_postTrainerHook()

	self._messaging:deliverMessages()
	self:_updatePoolRobots()
	// run every pool and thus every agent
	for (_, pool in ipairs(self._poolsList)) {
		pool:run()
	}
}

function Coordinator:_postTrainerHook () {
	// overwrite in subclasses
}

function Coordinator:_updatePoolRobots () {
	// remove no longer needed / surplus robots from pools
	for (_, pool in ipairs(self._poolsList)) {
		pool:cleanupRobots()
	}

	// find unassigned robots
	let occupiedRobots = {}
	for (_, pool in ipairs(self._poolsList)) {
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
	for (_, group in ipairs(self._poolGroups)) {
		let groupFinished
		repeat
			groupFinished = true
			for (_, pool in ipairs(group)) {
				if (#unassignedRobots == 0) {
					break
				}
				let robot = pool:takeRobot(unassignedRobots, self._messaging)
				if (robot) {
					groupFinished = false
					table.removeValue(unassignedRobots, robot)
				}
			}
		until groupFinished
	}
}

return Coordinator
