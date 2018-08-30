import {Coordinator} from "glados/control/coordinator";

import * as debug from "base/debug";
import {FriendlyRobot} from "base/robot";
import * as Entrypoints from "base/entrypoints";
import * as World from "base/world";
import {Trainer} from "glados/trainer/trainer";

// import {Ally} from "glados/agent/ally";
import {Attacker} from "glados/agent/attacker";
import {Defender} from "glados/agent/defender";
import {Hidden} from "glados/agent/hidden";
import {Keeper} from "glados/agent/keeper";
// import {Manual} from "glados/agent/manual";

let Agents = {
	// Ally: Ally,
	Attacker: Attacker,
	Defender: Defender,
	Hidden: Hidden,
	Keeper: Keeper,
	// Manual: Manual
};

import {AgentPool} from "glados/control/agentpool";
import {MainTrainer} from "glados/trainer/maintrainer";

class MainCoordinator extends Coordinator {
	constructor (trainer: MainTrainer) {
		let pools: {[name: string]: AgentPool} = {
			// manual: new AgentPool(Agents.Manual),
			// ally: new AgentPool(Agents.Ally),
			keeper: new AgentPool(Agents.Keeper),
			defense: new AgentPool(Agents.Defender),
			attack: new AgentPool(Agents.Attacker),
			hidden: new AgentPool(Agents.Hidden)
		};
		let poolGroups: AgentPool[][] = [
			// [ pools.manual ],
			// [ pools.ally ],
			[ pools.keeper ],
			[ pools.defense, pools.attack ],
			[ pools.hidden ]
		];
		super(trainer, pools, poolGroups);
	}

	_postTrainerHook () {
		// the trainer inbox is empty after deliverMessages
		let [attackers, defenders] = this._trainer._attackRatio.attackerDefenderDistribution();
		debug.set("#attackers", attackers);

		// process pool change requests
		let changingRobots = this._trainer._attackRatio.changingRobots();
		for (let changingRobotEntry of changingRobots) {
			this._changeRobot(attackers, defenders,
				changingRobotEntry.robot, changingRobotEntry.isAttacker);
		}

		// limit robot counts on attack/defense pool, causes automatic robot balancing
		this._pools.attack.setRobotLimit(attackers);
		this._pools.defense.setRobotLimit(defenders);
	}


	_changeRobot (attackers: number, defenders: number, changingRobot: FriendlyRobot, isAttacker: boolean) {
		let oldPool = isAttacker ? "attack" : "defense";
		let newPool = isAttacker ? "defense" : "attack";
		let poolLimit = isAttacker ? defenders : attackers;

		// kick the least suitable robot
		this._pools[newPool].setRobotLimit(poolLimit-1);
		this._pools[newPool].cleanupRobots();
		// ensure a new robot can be added
		this._pools[newPool].setRobotLimit(poolLimit);

		if (this._pools[oldPool].removeRobot(changingRobot)) {
			this._pools[newPool].takeRobot([changingRobot], this._messaging);
		} else if (changingRobot !== World.FriendlyKeeper) {
			throw new Error("invalid pool change request from " + changingRobot.id);
		}
	}
}

let coord: MainCoordinator | undefined = undefined;
function createCoordinator (mode?: "passive" | "aggressive"): ()=> boolean {
	return function() {
		if (coord == undefined) {
			let trainer = new MainTrainer(mode);
			coord = new MainCoordinator(trainer);
		}
		coord.run();
		return true;
	}
}

Entrypoints.add(" main", createCoordinator());
Entrypoints.add(" main aggressive", createCoordinator("aggressive"));
Entrypoints.add(" main passive", createCoordinator("passive"));