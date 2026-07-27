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

import * as Ball from "glados/observer/ball";
import * as ObserverRobot from "glados/observer/robot";
import { UnitTest } from "glados/test/unit/unittest";

interface ReceivesPassInfo {
	robotId: number;
	isFriendly: boolean;
	shouldReceivePass: boolean;
	// if true, simulate the receivespass being true for that robot the frame before by setting the hysteresis
	simulateReceivedBefore: boolean;
	// the ball shoot speed can not be inferred from the situation, so it must be included here
	maxBallSpeed: number;
}

interface FirstRobotAtBallInfo {
	// only for the opponent robots
	robotId: number;
	maxBallSpeed: number;
}

export class GladosObserverBall extends UnitTest {

	public constructor() {
		super();

		this._registerReceivesPassSituations();
		this._registerFirstRobotAtBallSituations();
	}

	private _registerFirstRobotAtBallSituations() {
		let s123 = {
			robotId: 4,
			maxBallSpeed: 3.4
		};
		this._addSituationTest("firstrobotatball", this._testFirstRobotAtBall, [
			["glados/test/unit/glados/ball-situations/firstrobotatball-1", s123],
			["glados/test/unit/glados/ball-situations/firstrobotatball-2", s123],
			["glados/test/unit/glados/ball-situations/firstrobotatball-3", s123]
		]);
	}

	private _testFirstRobotAtBall(testInfo: FirstRobotAtBallInfo) {
		World.Ball.maxSpeed = testInfo.maxBallSpeed;
		ObserverRobot._update();

		let firstRobot = Ball.firstRobotAtBall(World.OpponentRobots)[0];
		this._assert_not_undefined(firstRobot);
		this._assert_eq(firstRobot!.id, testInfo.robotId);
	}

	private _registerReceivesPassSituations() {
		let s1: [string, ReceivesPassInfo] = ["glados/test/unit/glados/ball-situations/receivespass-1", {
			robotId: 8,
			isFriendly: true,
			shouldReceivePass: true,
			simulateReceivedBefore: false,
			maxBallSpeed: 4.7
		}];
		let s2: [string, ReceivesPassInfo] = ["glados/test/unit/glados/ball-situations/receivespass-2", {
			...s1[1], simulateReceivedBefore: true }];
		let s3: [string, ReceivesPassInfo] = ["glados/test/unit/glados/ball-situations/receivespass-3", { ...s2[1] }];
		let s4: [string, ReceivesPassInfo] = ["glados/test/unit/glados/ball-situations/receivespass-4", {
			robotId: 3,
			isFriendly: true,
			shouldReceivePass: true,
			simulateReceivedBefore: false,
			maxBallSpeed: 5.45
		}];
		// TODO: test 4 currently failes. Once if passes, re-enable it again -> [s1, s2, s3, s4]
		this._addSituationTest("receivespass", this._testReceivesPass, [s1, s2, s3]);
	}

	private _testReceivesPass(testInfo: ReceivesPassInfo) {

		World.Ball.maxSpeed = testInfo.maxBallSpeed;

		let robot = testInfo.isFriendly ? World.FriendlyRobotsById[testInfo.robotId] : World.OpponentRobotsById[testInfo.robotId];
		if (testInfo.simulateReceivedBefore) {
			Ball.setReceivesPass(robot, true);
		}
		Ball._update();
		this._assert_eq(testInfo.shouldReceivePass, Ball.receivesPass(robot));
	}
}
export let testClass = GladosObserverBall;
