import * as Field from "base/field";
import { Vector } from "base/vector";
import * as World from "base/world";

import { Attacker } from "glados/agent/attacker";
import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType, Messaging } from "glados/control/messaging";
import { Shoot } from "glados/task/ability/shoot";
import { Task } from "glados/task/base";
import { UnitTest } from "glados/test/unit/unittest";
import * as PathHelper from "glados/trajectory/pathhelper";

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

export class GladosAbilityShoot extends UnitTest {

	constructor() {
		super();
		this.addSituationTest("attackposition in field", this.testAttackPositionInField,
			[["glados/test/unit/glados/shoot-situations/shoot-out-of-field", undefined]]);
	}

	private testAttackPositionInField(a: undefined) {

		let robot = World.FriendlyRobotsById[5];

		let messaging = new Messaging();
		let agent5 = new Attacker(robot, messaging);
		messaging.registerAgent(agent5);
		let trainerBox = messaging.registerTrainer();

		let behavior = new DummyBehavior(agent5);
		let task = new DummyTask(behavior);

		let obstacleTable = {
			task: task,
			ignoreBallPlacementObstacle: true
		};
		PathHelper.setDefaultObstaclesByTable(robot.path, robot, obstacleTable);

		let shoot = new Shoot(task);
		// these values are the ones that were used in the first situation (if more situations are added, put these in the parameters)
		shoot._shoot(new Vector(2.63, 1.61), 3, World.Time + 1.8, new Vector(-2.63, 1.61), 0.061);

		let attackPosition = trainerBox.receiveSingleSender(MessageType.attackPosition)[1];

		this.assert_not_undefined(attackPosition);
		this.assert_true(Field.isInAllowedField(attackPosition!, World.Ball.radius));
	}
}
export let testClass = GladosAbilityShoot;
