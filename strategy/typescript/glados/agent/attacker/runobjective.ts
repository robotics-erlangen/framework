/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

import { Attacker } from "glados/agent/attacker";
import { Agent } from "glados/agent/base/agent";
import { Behavior, Checkable } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";

export class RunObjective implements Checkable {
	private _agent: Attacker;
	private _runner?: Checkable;

	public constructor(agent: Agent) {
		if (!(agent instanceof Attacker)) {
			throw new Error("a/a/runobjective may only be used on attackers");
		}
		this._agent = agent;
	}

	public check(): Behavior | undefined {
		const messaging = this._agent.messaging();

		const [, receivedObjective] = messaging.receiveSingleSender(MessageType.selectedObjective, true);
		if (!receivedObjective) {
			return undefined;
		}

		const isMainAttacker = messaging.receiveTrainer(MessageType.mainAttacker) === this._agent.robot();

		if (isMainAttacker) {
			/* To keep supporter state, objectives have to live across main
			* attacker switches. Thus we have to check here whether a new main
			* attacker is registering
			*/
			if (receivedObjective.getMaRunner(this._agent).agent().robot() !== this._agent.robot()) {
				receivedObjective.setMaRunner(this._agent);
			}
			this._runner = receivedObjective.getMaRunner(this._agent);
		} else {
			this._runner = receivedObjective.getSupportRunner(this._agent);
		}

		// This may happen if the objective was not constructed by this
		// agents instance of SelectObjective, e.g if the main attacker
		// switched from defender to attacker
		if (this._runner.agent() !== this._agent) {
			this._runner.setAgent(this._agent);
		}

		return this._runner.check();
	}

	public mainAttackerParameters(activeBehavior?: Behavior) {
		if (this._runner) {
			return this._runner.mainAttackerParameters(activeBehavior);
		}
		// this type assertion is necessary since the compiler infers the type to be (undefined | boolean)[]
		return [undefined, false] as [undefined, false];
	}

	public clearMainAttackerParameters() {
		if (this._runner) {
			this._runner.clearMainAttackerParameters();
		}
	}

	public agent() {
		return this._agent;
	}

	public setAgent(agent: Agent) {
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

