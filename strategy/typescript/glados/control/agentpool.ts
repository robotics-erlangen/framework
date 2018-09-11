import { FriendlyRobot } from "base/robot";

import { Agent } from "glados/agent/base/agent";
import { Messaging } from "glados/control/messaging";

// sort in descending order
function sortByRating(a1: Agent, a2: Agent): number {
	return a2.rateRobot() - a1.rateRobot();
}

export class AgentPool {
	private _agents: Agent[] = [];
	private _agentType: typeof Agent;
	private _robotLimit: number;

	constructor(agentType: typeof Agent, robotLimit: number = Infinity) {
		// robots and agents are mapped 1:1 to each other
		this._agentType = agentType;
		this._robotLimit = robotLimit;
	}

	run() {
		for (let agent of this._agents) {
			agent.run();
		}
	}

	// remove agents and associated robots we no longer want to keep
	cleanupRobots() {
		let agents: Agent[] = []; // agents to keep
		for (let agent of this._agents) {
			if (agent.keepRobot()) {
				agents.push(agent);
			}
		}

		// only sort if we have too many robots
		if (this._robotLimit < agents.length) {
			// sort with by decreasing importance
			agents.sort(sortByRating);
			agents.splice(this._robotLimit, agents.length - this._robotLimit);
		}
		this._agents = agents;
	}

	takeRobot(robots: FriendlyRobot[], messaging: Messaging): FriendlyRobot | undefined {
		if (this._agents.length >= this._robotLimit) {
			return;
		}

		let robot = this._agentType.takeRobot(robots);
		if (robot != undefined) {
			this._agents.push(new (this._agentType as any)(robot, messaging));
		}
		return robot;
	}

	robots(): FriendlyRobot[] {
		let robots: FriendlyRobot[] = [];
		for (let agent of this._agents) {
			robots.push(agent.robot());
		}
		return robots;
	}

	removeRobot(robot: FriendlyRobot): boolean {
		for (let agent of this._agents) {
			if (agent.robot() === robot) {
				this._agents.splice(this._agents.indexOf(agent), 1);
				return true;
			}
		}
		return false;
	}

	setRobotLimit(robotLimit: number) {
		this._robotLimit = robotLimit;
	}
}
