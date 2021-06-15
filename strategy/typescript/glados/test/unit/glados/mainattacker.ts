import { FriendlyRobot } from "base/robot";
import { Vector } from "base/vector";
import * as World from "base/world";

import { Agent } from "glados/agent/base/agent";
import { Behavior, CheckableConstructor, MainAttackerParameters, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType, Messaging } from "glados/control/messaging";
import { Task } from "glados/task/base";
import { UnitTest } from "glados/test/unit/unittest";
import { Roles } from "glados/trainer/roles";

class DummyBehavior extends Behavior {
	check() {
		return this;
	}

	_updateTask(): TaskAssignment<typeof DummyTask> {
		return [DummyTask];
	}
}

class DummyTask extends Task {
	run() {}
}

class DummyAgent extends Agent {
	static takeRobot(_robots: FriendlyRobot[]): FriendlyRobot | undefined {
		return _robots[0];
	}

	getBehaviors(): CheckableConstructor[] {
		return [DummyBehavior];
	}

	keepRobot(): boolean {
		return true;
	}

	rateRobot(): number {
		return 1;
	}
}

interface MainattackerInfo {
	file: string;
	desiredMAId: number;
	previousMAId: number;
	parameters: {[id: number]: MainAttackerParameters};
	robotsToTest: number[];
	maxSpeed: number;
}

export class GladosMainattacker extends UnitTest {

	constructor() {
		super();

		const s1 = {
			file: "glados/test/unit/glados/mainattacker-situations/MA1",
			desiredMAId: 8,
			previousMAId: 14, // just some unrelated robot
			parameters: {
				8: [new Vector(0.45, -0.45), 0, undefined] as MainAttackerParameters,
				11: [new Vector(3.03, 1.92), 3.5, undefined] as MainAttackerParameters
			},
			robotsToTest: [8, 11],
			maxSpeed: 5.7
		};
		this.addSituationTest("breakpass active", this.testDesiredMainattacker, [[s1.file, s1]]);
	}

	private testDesiredMainattacker(info: MainattackerInfo) {
		World.Ball.maxSpeed = info.maxSpeed;

		let messaging = new Messaging();
		let trainerBox = messaging.registerTrainer();
		for (let id of info.robotsToTest) {
			let agent = new DummyAgent(World.FriendlyRobotsById[id], messaging);
			let behavior = agent._behaviors.check();
			agent._activeBehavior = behavior;
			if (info.parameters[id]) {
				const parameters = info.parameters[id]!;
				behavior!._applyForMainAttacker(parameters[0], parameters[1], parameters[2]);
			} else {
				behavior!._applyForMainAttacker();
			}
			agent._applyForMainAttacker(undefined);
		}

		let roles = new Roles(trainerBox);
		roles._exclusiveRoles[MessageType.mainAttacker] = World.FriendlyRobotsById[info.previousMAId];
		roles._chooseExclusiveRoles();

		let ma = trainerBox.receiveTrainer(MessageType.mainAttacker);
		this.assert_equal(ma, World.FriendlyRobotsById[info.desiredMAId]);
	}
}
export let testClass = GladosMainattacker;
