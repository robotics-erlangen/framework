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
	public check() {
		return this;
	}

	protected _updateTask(): TaskAssignment<typeof DummyTask> {
		return [DummyTask];
	}
}

class DummyTask extends Task {
	public run() {}
}

export class GladosAbilityShoot extends UnitTest {

	public constructor() {
		super();
		this._addSituationTest("attackposition in field", this._testAttackPositionInField,
			[["glados/test/unit/glados/shoot-situations/shoot-out-of-field", undefined]]);
	}

	private _testAttackPositionInField(a: undefined) {

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
		shoot.shoot(new Vector(2.63, 1.61), 3, World.Time + 1.8, new Vector(-2.63, 1.61), 0.061);

		let attackPosition = trainerBox.receiveSingleSender(MessageType.attackPosition)[1];

		this._assert_not_undefined(attackPosition);
		this._assert_true(Field.isInAllowedField(attackPosition!, World.Ball.radius));
	}
}
export let testClass = GladosAbilityShoot;
