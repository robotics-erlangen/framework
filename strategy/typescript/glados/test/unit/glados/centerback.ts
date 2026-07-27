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

import * as pb from "base/protobuf";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { Defender } from "glados/agent/defender";
import { CenterBack as CenterbackBehavior } from "glados/agent/defender/centerback";
import { Messaging } from "glados/control/messaging";
import { CenterBack as CenterbackTask } from "glados/task/defender/centerback";
import { UnitTest } from "glados/test/unit/unittest";

interface CenterbackInfo {
	file: string;
	robotId: number;
	centerbackTarget: Position;
	shouldChip: boolean;
}

export class GladosCenterback extends UnitTest {

	public constructor() {
		super();

		const s1 = {
			file: "glados/test/unit/glados/centerback-situations/do-not-shoot-into-own-goal",
			robotId: 8,
			centerbackTarget: new Vector(-0.11, -4.70),
			shouldChip: false
		};
		this._addSituationTest("no own goal chip", this._testCenterbackChip, [[s1.file, s1]]);
	}

	private _testCenterbackChip(info: CenterbackInfo) {
		const robot = World.FriendlyRobotsById[info.robotId];
		const messaging = new Messaging();
		const agent = new Defender(robot, messaging);
		const behavior = new CenterbackBehavior(agent);
		let centerback = new CenterbackTask(behavior, { pos: info.centerbackTarget });
		centerback.run();
		if (info.shouldChip) {
			this._assert_eq((robot as any)._kickStyle, pb.robot.Command.KickStyle.Chip);
		} else {
			this._assert_undefined((robot as any)._kickStyle);
		}
	}
}
export let testClass = GladosCenterback;
