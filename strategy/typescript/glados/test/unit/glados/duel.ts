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

import * as World from "base/world";

import { Attacker } from "glados/agent/attacker";
import { Duel as DuelBehavior } from "glados/agent/attacker/duel";
import { MessageType, Messaging } from "glados/control/messaging";
import { UnitTest } from "glados/test/unit/unittest";

interface DuelInfo {
	file: string;
	robotId: number;
}

export class GladosDuel extends UnitTest {

	public constructor() {
		super();

		const s1 = {
			file: "glados/test/unit/glados/duel-situations/duel1",
			robotId: 6,
		};
		this._addSituationTest("duel", this._testDuel, [[s1.file, s1]]);
	}

	private _testDuel(info: DuelInfo) {
		const robot = World.FriendlyRobotsById[info.robotId];
		const messaging = new Messaging();
		const agent = new Attacker(robot, messaging);
		const behavior = new DuelBehavior(agent);

		const trainerBox = messaging.registerTrainer();
		trainerBox.sendBroadcast(MessageType.mainAttacker, robot);
		messaging.deliverMessages();

		this._assert_eq(behavior, behavior.check());
	}
}
export let testClass = GladosDuel;
