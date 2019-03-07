import * as World from "base/world";

import { AgentPool } from "glados/control/agentpool";
import { Messaging } from "glados/control/messaging";
import { MainTrainer } from "glados/trainer/maintrainer";

export class Coordinator {
	_trainer: MainTrainer;
	_pools: {[name: string]: AgentPool};
	_poolGroups: AgentPool[][];
	_poolsList: AgentPool[] = [];
	_messaging: Messaging;

	constructor(trainer: MainTrainer, pools: {[name: string]: AgentPool}, poolGroups: AgentPool[][]) {
		this._trainer = trainer;
		// list of agentPools
		this._pools = pools;
		// list of lists with pools
		this._poolGroups = poolGroups;

		// get rid of calling pairs over and over again
		for (let pool of Object.values(this._pools)) {
			this._poolsList.push(pool);
		}

		this._messaging = trainer._allMessaging;
	}

	run() {
		this._trainer.run();
		this._postTrainerHook();

		this._messaging.deliverMessages();
		this._updatePoolRobots();
		// run every pool and thus every agent
		for (let pool of this._poolsList) {
			pool.run();
		}
	}

	_postTrainerHook() {
		// overwrite in subclasses
	}

	_updatePoolRobots() {
		// remove no longer needed / surplus robots from pools
		for (let pool of this._poolsList) {
			pool.cleanupRobots();
		}

		// find unassigned robots
		let occupiedRobots: {[id: number]: boolean} = {};
		for (let pool of this._poolsList) {
			for (let robot of pool.robots()) {
				occupiedRobots[robot.id] = true;
			}
		}
		let unassignedRobots = [];
		for (let robot of World.FriendlyRobotsAll) {
			if (!occupiedRobots[robot.id]) {
				unassignedRobots.push(robot);
			}
		}

		// assign robots to pools by pool groups
		// assign to first group until these pools don't want any further robots
		// the continue with the second group and so on
		// if a group has multiple pools assignment alternates between them
		for (let group of this._poolGroups) {
			let groupFinished = true;
			do {
				groupFinished = true;
				for (let pool of group) {
					if (unassignedRobots.length === 0) {
						break;
					}
					let robot = pool.takeRobot(unassignedRobots, this._messaging);
					if (robot) {
						groupFinished = false;
						unassignedRobots.splice(unassignedRobots.indexOf(robot), 1);
					}
				}
			} while (!groupFinished);
		}
	}
}
