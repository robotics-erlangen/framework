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

		constructor(agent: Agent) {
			this._agent = agent;
		}

		check() {
			return shouldRun ? this : undefined;
		}

		agent() {
			return this._agent;
		}

		setAgent(agent: Agent) {
			this._agent = agent;
		}
	} as unknown as CheckableConstructor;
};

class TestBehavior extends Behavior {
	check() {
		return this;
	}

	_updateTask() {
		return undefined!;
	}
}

export class GladosBehavior extends UnitTest {
	constructor() {
		super();
		this.addTest("test_Behavior_agent", this.test_Behavior_agent);
		this.addTest("test_CheckableList_check", this.test_CheckableList_check);
		this.addTest("test_CheckableList_agent", this.test_CheckableList_agent);
	}

	private test_Behavior_agent() {
		const robot = { tag: "A" };
		const agentOne = mockAgent("A", robot);
		const agentTwo = mockAgent("B", robot);

		const behavior = new TestBehavior(agentOne);
		this.assert_equal(behavior.agent(), agentOne);
		behavior.setAgent(agentTwo);
		this.assert_equal(behavior.agent(), agentTwo);
	}

	private test_CheckableList_check() {
		const CheckableA = mockCheckable("A", false);
		const CheckableB = mockCheckable("B", true);
		const list = new CheckableList(mockAgent("check"), [ CheckableA, CheckableB ]);
		this.assert_true(list.check() instanceof CheckableB);
	}

	private test_CheckableList_agent() {
		const CheckableA = mockCheckable("A", true);

		const agentOne = mockAgent("A");
		const agentTwo = mockAgent("B");

		const list = new CheckableList(agentOne, [ CheckableA ]);

		this.assert_equal(list.agent(), agentOne);
		this.assert_equal(list.check()!.agent(), agentOne);

		list.setAgent(agentTwo);

		this.assert_equal(list.agent(), agentTwo);
		this.assert_equal(list.check()!.agent(), agentTwo);
	}
}

export const testClass = GladosBehavior;
