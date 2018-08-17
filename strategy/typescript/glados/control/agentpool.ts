import {FriendlyRobot} from "base/robot";

function sortByRating (a1, a2): number {
	return a1.rateRobot() - a2.rateRobot();
}

class AgentPool {
	private _agents: Agent[] = [];
	private _agentType: typeof Agent;
	private _robotLimit: number;

	constructor (agentType: typeof Agent, robotLimit: number = Infinity) {
		// robots and agents are mapped 1:1 to each other
		this._agentType = agentType;
		this._robotLimit = robotLimit;
	}

	run () {
		for (let agent of this._agents) {
			agent.run();
		}
	}

	// remove agents and associated robots we no longer want to keep
	cleanupRobots () {
		let agents: Agent[] = []; // agents to keep
		for (let agent of this._agents) {
			if(agent.keepRobot()) {
				agents.push(agent);
			}
		}

		// only sort if we have too many robots
		if (this._robotLimit < agents.length) {
			// sort with by decreasing importance
			agents.sort(sortByRating);
			table.truncate(agents, this._robotLimit);
		}
		this._agents = agents;
	}

	takeRobot (robots: FriendlyRobot[], messaging: Messaging): FriendlyRobot {
		if (this._agents.length >= this._robotLimit) {
			return;
		}

		let robot = this._agentType.takeRobot(robots);
		if (robot) {
			this._agents.push(this._agentType(robot, messaging));
		}
		return robot;
	}

	robots (): FriendlyRobot[] {
		let robots: FriendlyRobot[] = [];
		for (let agent of this._agents) {
			robots.push(agent.robot());
		}
		return robots;
	}

	removeRobot (robot: FriendlyRobot): boolean {
		for (let agent of this._agents) {
			if (agent.robot() == robot) {
				table.removeValue(this._agents, agent);
				return true;
			}
		}
		return false;
	}

	setRobotLimit (robotLimit: number) {
		this._robotLimit = robotLimit;
	}
}