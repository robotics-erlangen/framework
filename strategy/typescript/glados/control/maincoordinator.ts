import * as debug from "base/debug";
import * as Entrypoints from "base/entrypoints";
import { FriendlyRobot } from "base/robot";
import * as World from "base/world";

// import {Ally} from "glados/agent/ally";
import { Attacker } from "glados/agent/attacker";
import { Defender } from "glados/agent/defender";
import { Hidden } from "glados/agent/hidden";
import { Keeper } from "glados/agent/keeper";
import { AgentPool, AttackerPool } from "glados/control/agentpool";
import { Coordinator } from "glados/control/coordinator";
import { MainTrainer } from "glados/trainer/maintrainer";
// import {Manual} from "glados/agent/manual";

const AGENTS = {
	// Ally: Ally,
	Attacker: Attacker,
	Defender: Defender,
	Hidden: Hidden,
	Keeper: Keeper,
	// Manual: Manual
};

// @return: returns an int i s.t. list[list.length-1] and list[i] have opposite values for isAttacker, undefined if there is none
function findPair(list: { isAttacker: boolean }[]): number | undefined {
	if (list.length < 2) {
		return undefined;
	}
	let searchBool = !list[list.length - 1].isAttacker;
	for (let i = 0; i < list.length - 1; ++i) {
		if (list[i].isAttacker === searchBool) return i;
	}
	return undefined;
}

export class MainCoordinator extends Coordinator {
	constructor(trainer: MainTrainer) {
		let pools: { [name: string]: AgentPool } = {
			// manual: new AgentPool(Agents.Manual),
			// ally: new AgentPool(Agents.Ally),
			keeper: new AgentPool(AGENTS.Keeper),
			defense: new AgentPool(AGENTS.Defender),
			attack: new AttackerPool(AGENTS.Attacker),
			hidden: new AgentPool(AGENTS.Hidden)
		};
		let poolGroups: AgentPool[][] = [
			// [ pools.manual ],
			// [ pools.ally ],
			[pools.keeper],
			[pools.defense, pools.attack],
			[pools.hidden]
		];
		super(trainer, pools, poolGroups);
	}

	_postTrainerHook() {
		// the trainer inbox is empty after deliverMessages
		let [attackers, defenders] = this._trainer._attackRatio.attackerDefenderDistribution();
		debug.set("#attackers", attackers);

		// process pool change requests
		let changingRobots = this._trainer._attackRatio.changingRobots();
		let pair = findPair(changingRobots);
		while (pair != undefined) {
			let robot1 = changingRobots[pair].robot;
			let robot1IsAttacker = changingRobots[pair].isAttacker;
			let robot2 = changingRobots.pop()!.robot;
			changingRobots.splice(pair, 1);

			this._swapRobots(robot1, robot2, robot1IsAttacker);
			pair = findPair(changingRobots);
		}
		for (let changingRobotEntry of changingRobots) {
			this._changeRobot(attackers, defenders,
				changingRobotEntry.robot, changingRobotEntry.isAttacker);
		}

		// limit robot counts on attack/defense pool, causes automatic robot balancing
		this._pools.attack.setRobotLimit(attackers);
		this._pools.defense.setRobotLimit(defenders);
	}


	_changeRobot(attackers: number, defenders: number, changingRobot: FriendlyRobot, isAttacker: boolean) {
		let oldPool = isAttacker ? "attack" : "defense";
		let newPool = isAttacker ? "defense" : "attack";
		let poolLimit = isAttacker ? defenders : attackers;

		// robots with forceKeepingInPool must not be exchanged
		this._pools[newPool].setRobotLimit(poolLimit);
		if (!this._pools[newPool].hasExchangeableRobot()) {
			amun.log("Trying to to remove robot from pool with force keeping in pool");
			return;
		}

		// kick the least suitable robot
		this._pools[newPool].setRobotLimit(poolLimit - 1);
		this._pools[newPool].cleanupRobots();
		// ensure a new robot can be added
		this._pools[newPool].setRobotLimit(poolLimit);

		if (this._pools[oldPool].removeRobot(changingRobot)) {
			this._pools[newPool].takeRobot([changingRobot], this._messaging);
		} else if (changingRobot !== World.FriendlyKeeper) {
			throw new Error(`invalid pool change request from ${changingRobot.id}`);
		}
	}

	private _swapRobots(changingRobot1: FriendlyRobot, changingRobot2: FriendlyRobot, robot1IsAttacker: boolean) {
		let oldPool1 = robot1IsAttacker ? "attack" : "defense";
		let newPool1 = robot1IsAttacker ? "defense" : "attack";
		// We don't need to check forceKeepingInPool as both robots volunteered
		if (changingRobot1 === World.FriendlyKeeper || changingRobot2 === World.FriendlyKeeper) {
			throw new Error("invalid pool change from Keeper");
		}
		if (!this._pools[oldPool1].removeRobot(changingRobot1)) {
			throw new Error(`invalid pool change request from ${changingRobot1.id}`);
		}
		if (!this._pools[newPool1].removeRobot(changingRobot2)) {
			throw new Error(`invalid pool change request from ${changingRobot2.id}`);
		}

		this._pools[newPool1].takeRobot([changingRobot1], this._messaging);
		this._pools[oldPool1].takeRobot([changingRobot2], this._messaging);
	}
}

let coord: MainCoordinator | undefined = undefined;
function createCoordinator(mode?: "passive" | "aggressive"): () => boolean {
	return function() {
		if (coord == undefined) {
			let trainer = new MainTrainer(mode);
			coord = new MainCoordinator(trainer);
		}
		coord.run();
		return true;
	};
}

Entrypoints.add(" main", createCoordinator());
Entrypoints.add(" main aggressive", createCoordinator("aggressive"));
Entrypoints.add(" main passive", createCoordinator("passive"));
