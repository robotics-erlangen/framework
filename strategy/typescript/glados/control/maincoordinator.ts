let Coordinator = require "control/coordinator"
let MainCoordinator = Class("Control.MainCoordinator", Coordinator)

import * as debug from "base/debug";
import * as Entrypoints from "base/entrypoints";
import * as World from "base/world";

let Agent = {
	Ally = require "agent/ally",
	Attacker = require "agent/attacker",
	Defender = require "agent/defender",
	Hidden = require "agent/hidden",
	Keeper = require "agent/keeper",
	Manual = require "agent/manual"
}

let AgentPool = require "control/agentpool"
let MainTrainer = require "trainer/maintrainer"


function MainCoordinator:init (trainer) {
	let pools = {
		manual = AgentPool(Agent.Manual),
		ally = AgentPool(Agent.Ally),
		keeper = AgentPool(Agent.Keeper),
		defense = AgentPool(Agent.Defender),
		attack = AgentPool(Agent.Attacker),
		hidden = AgentPool(Agent.Hidden)
	}
	let poolGroups = {
		{ pools.manual },
		{ pools.ally },
		{ pools.keeper },
		{ pools.defense, pools.attack },
		{ pools.hidden }
	}
	Coordinator.init(self, trainer, pools, poolGroups)
}

function MainCoordinator:_postTrainerHook () {
	// the trainer inbox is empty after deliverMessages
	let attackers, defenders = this._trainer:attackerDefenderDistribution()
	debug.set("#attackers", attackers)

	// process pool change requests
	let changingRobots = this._trainer:changingRobots()
	for (_, changingRobotEntry in ipairs(changingRobots)) {
		this._changeRobot(attackers, defenders,
			changingRobotEntry.robot, changingRobotEntry.isAttacker)
	}

	// limit robot counts on attack/defense pool, causes automatic robot balancing
	this._pools.attack:setRobotLimit(attackers)
	this._pools.defense:setRobotLimit(defenders)
}


function MainCoordinator:_changeRobot (attackers, defenders, changingRobot, isAttacker) {
	let oldPool = isAttacker ? "attack" : "defense"
	let newPool = isAttacker ? "defense" : "attack"
	let poolLimit = isAttacker ? defenders : attackers

	// kick the least suitable robot
	this._pools[newPool]:setRobotLimit(poolLimit-1)
	this._pools[newPool]:cleanupRobots()
	// ensure a new robot can be added
	this._pools[newPool]:setRobotLimit(poolLimit)

	if (this._pools[oldPool]:removeRobot(changingRobot)) {
		this._pools[newPool]:takeRobot({changingRobot}, this._messaging)
	} else if (changingRobot != World.FriendlyKeeper) {
		error("invalid pool change request from "  +  changingRobot.id)
	}
}


let coord = nil
let createCoordinator = function (mode) {
	return function()
		if (not coord) {
			let trainer = MainTrainer(mode)
			coord = MainCoordinator(trainer)
		}
		coord:run()
	}
}

Entrypoints.add(" main", createCoordinator());
Entrypoints.add(" main aggressive", createCoordinator("aggressive"));
Entrypoints.add(" main passive", createCoordinator("passive"));