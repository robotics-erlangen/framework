import * as ListUtil from "base/listutil";
import { FriendlyRobot } from "base/robot";

import { Agent } from "glados/agent/base/agent";
import { MessageType, Messaging } from "glados/control/messaging";

// sort in descending order
function sortByRating(a1: Agent, a2: Agent): number {
	return a2.rateRobot() - a1.rateRobot();
}

export class AgentPool {
	protected _agents: Agent[] = [];
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

	// can be overridden to make sure robots are not beeing dropped.
	protected isImmune(x: Agent) {
		return false;
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
			// first: get immuneRobots.
			let [taken, remaining] = ListUtil.partition(agents, (x: Agent) => this.isImmune(x));
			if (taken.length > this._robotLimit) {
				throw new Error(`More immunes than allowed Robots: ${this._robotLimit}`);
			}
			// sort with by decreasing importance
			remaining.sort(sortByRating);
			remaining.splice(this._robotLimit - taken.length);
			agents = taken.concat(remaining);
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

	hasExchangeableRobot(): boolean {
		if (this._agents.length < this._robotLimit) {
			return true;
		}
		let possibleRobots = 0;
		for (let agent of this._agents) {
			if (this.isImmune(agent)) {
				continue;
			}
			if (agent._activeBehavior && !agent._activeBehavior.forceKeepingInPool()) {
				possibleRobots++;
			}
		}
		return possibleRobots > Math.max(0, this._agents.length - this._robotLimit);
	}

	setRobotLimit(robotLimit: number) {
		if (robotLimit < 0) {
			throw new Error(`We don't allow negative robot limits: ${robotLimit}`);
		}
		this._robotLimit = robotLimit;
	}
}

export class AttackerPool extends AgentPool {
	constructor(agentType: typeof Agent, robotLimit: number = Infinity) {
		super(agentType, robotLimit);
	}

	protected isImmune(x: Agent) {
		let moveInfo = x._messaging.receiveTrainer(MessageType.moveInfo);
		if (moveInfo == undefined) {
			return false;
		}
		let attackers = moveInfo.attackers;
		return attackers.some((a: (number | undefined)) => a === x.robot().id);
	}
}
