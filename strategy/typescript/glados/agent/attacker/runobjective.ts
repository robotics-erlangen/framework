import { Attacker } from "glados/agent/attacker";
import { Agent } from "glados/agent/base/agent";
import { Behavior, Checkable } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";

export class RunObjective implements Checkable {
	private _agent: Attacker;
	private _runner?: Checkable;

	constructor(agent: Agent) {
		if (!(agent instanceof Attacker)) {
			throw new Error("a/a/runobjective may only be used on attackers");
		}
		this._agent = agent;
	}

	check(): Behavior | undefined {
		const messaging = this._agent.messaging();

		if (this._agent.objective !== undefined) {
			const isMainAttacker = messaging.receiveTrainer(MessageType.mainAttacker) === this._agent.robot();
			if (!isMainAttacker) {
				throw new Error("Propagated objective through agent on non main attacker");
			}

			this._runner = this._agent.objective.getMaRunner();
			// This may happen if the objective was not constructed by this
			// agents instance of SelectObjective, e.g if the main attacker
			// switched from defender to attacker
			if (this._runner.agent() !== this._agent) {
				this._runner.setAgent(this._agent);
			}
		} else {
			const [, receivedObjective] = messaging.receiveSingleSender(MessageType.selectedObjective);

			if (!receivedObjective) {
				return undefined;
			}

			this._runner = receivedObjective.getSupportRunner(this._agent);
		}

		return this._runner.check();
	}

	mainAttackerParameters(activeBehavior?: Behavior) {
		if (this._runner) {
			return this._runner.mainAttackerParameters(activeBehavior);
		}
		// this type assertion is necessary since the compiler infers the type to be (undefined | boolean)[]
		return [undefined, false] as [undefined, false];
	}

	clearMainAttackerParameters() {
		if (this._runner) {
			this._runner.clearMainAttackerParameters();
		}
	}

	agent() {
		return this._agent;
	}

	setAgent(agent: Agent) {
		if (this._agent.robot() !== agent.robot()) {
			throw new Error("Can't reuse behavior with different robot");
		}
		if (!(agent instanceof Attacker)) {
			throw new Error("a/a/runobjective may only be used on attackers");
		}
		this._agent = agent;
		if (this._runner) {
			this._runner.setAgent(agent);
		}
	}
}

