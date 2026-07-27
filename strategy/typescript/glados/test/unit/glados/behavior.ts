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

import { Agent } from "glados/agent/base/agent";
import { Behavior, CheckableConstructor, CheckableList } from "glados/agent/base/behavior";
import { UnitTest } from "glados/test/unit/unittest";

const mockAgent = (tag: string, mockRobot: { tag: string } = { tag }): Agent => {
	const mockMessaging = { tag };
	const agent = { tag, robot: () => mockRobot, messaging: () => mockMessaging };
	return agent as unknown as Agent;
};

const mockCheckable = (tag: string, shouldRun: boolean): CheckableConstructor => {
	return class {
		public tag: string = tag;

		private _agent: Agent;

		public constructor(agent: Agent) {
			this._agent = agent;
		}

		public check() {
			return shouldRun ? this : undefined;
		}

		public agent() {
			return this._agent;
		}

		public setAgent(agent: Agent) {
			this._agent = agent;
		}
	} as unknown as CheckableConstructor;
};

class TestBehavior extends Behavior {
	public check() {
		return this;
	}

	protected _updateTask() {
		return undefined!;
	}
}

export class GladosBehavior extends UnitTest {
	public constructor() {
		super();
		this._addTest("test_Behavior_agent", this._test_Behavior_agent);
		this._addTest("test_CheckableList_check", this._test_CheckableList_check);
		this._addTest("test_CheckableList_agent", this._test_CheckableList_agent);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	private _test_Behavior_agent() {
		const robot = { tag: "A" };
		const agentOne = mockAgent("A", robot);
		const agentTwo = mockAgent("B", robot);

		const behavior = new TestBehavior(agentOne);
		this._assert_eq(behavior.agent(), agentOne);
		behavior.setAgent(agentTwo);
		this._assert_eq(behavior.agent(), agentTwo);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	private _test_CheckableList_check() {
		const CHECKABLE_A = mockCheckable("A", false);
		const CHECKABLE_B = mockCheckable("B", true);
		const list = new CheckableList(mockAgent("check"), [CHECKABLE_A, CHECKABLE_B]);
		this._assert_true(list.check() instanceof CHECKABLE_B);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	private _test_CheckableList_agent() {
		const CHECKABLE_A = mockCheckable("A", true);

		const agentOne = mockAgent("A");
		const agentTwo = mockAgent("B");

		const list = new CheckableList(agentOne, [CHECKABLE_A]);

		this._assert_eq(list.agent(), agentOne);
		this._assert_eq(list.check()!.agent(), agentOne);

		list.setAgent(agentTwo);

		this._assert_eq(list.agent(), agentTwo);
		this._assert_eq(list.check()!.agent(), agentTwo);
	}
}

export const testClass = GladosBehavior;
