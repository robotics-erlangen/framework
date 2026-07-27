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

import { FriendlyRobot } from "base/robot";
import { Vector } from "base/vector";
import * as World from "base/world";

import { Agent } from "glados/agent/base/agent";
import { Behavior, CheckableConstructor, CheckableList, MainAttackerParameters, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType, Messaging } from "glados/control/messaging";
import { Task } from "glados/task/base";
import { UnitTest } from "glados/test/unit/unittest";
import { Roles } from "glados/trainer/roles";

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

class DummyAgent extends Agent {
	public get behaviors(): CheckableList {
		return this._behaviors;
	}

	public set activeBehavior(activeBehavior: Behavior | undefined) {
		this._activeBehavior = activeBehavior;
	}

	public applyForMainAttacker(task: Task | undefined) {
		this._applyForMainAttacker(task);
	}

	public static takeRobot(_robots: FriendlyRobot[]): FriendlyRobot | undefined {
		return _robots[0];
	}

	public getBehaviors(): CheckableConstructor[] {
		return [DummyBehavior];
	}

	public keepRobot(): boolean {
		return true;
	}

	public rateRobot(): number {
		return 1;
	}
}

interface MainattackerInfo {
	file: string;
	desiredMAId: number;
	previousMAId: number;
	parameters: { [id: number]: MainAttackerParameters };
	robotsToTest: number[];
	maxSpeed: number;
}

export class GladosMainattacker extends UnitTest {

	public constructor() {
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
		this._addSituationTest("breakpass active", this._testDesiredMainattacker, [[s1.file, s1]]);
	}

	private _testDesiredMainattacker(info: MainattackerInfo) {
		World.Ball.maxSpeed = info.maxSpeed;

		let messaging = new Messaging();
		let trainerBox = messaging.registerTrainer();
		for (let id of info.robotsToTest) {
			let agent = new DummyAgent(World.FriendlyRobotsById[id], messaging);
			let behavior = agent.behaviors.check();
			agent.activeBehavior = behavior;
			if (info.parameters[id]) {
				const parameters = info.parameters[id]!;
				behavior!.applyForMainAttacker(parameters[0], parameters[1], parameters[2]);
			} else {
				behavior!.applyForMainAttacker();
			}
			agent.applyForMainAttacker(undefined);
		}

		let roles = new Roles(trainerBox);
		(roles as any)._exclusiveRoles[MessageType.mainAttacker] = World.FriendlyRobotsById[info.previousMAId];
		roles.chooseExclusiveRoles();

		let ma = trainerBox.receiveTrainer(MessageType.mainAttacker);
		this._assert_eq(ma, World.FriendlyRobotsById[info.desiredMAId]);
	}
}
export let testClass = GladosMainattacker;
