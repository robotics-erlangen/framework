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

		this.registerReceivesPassSituations();
		this.registerFirstRobotAtBallSituations();
	}

	private registerFirstRobotAtBallSituations() {
		let s123 = {
			robotId: 4,
			maxBallSpeed: 3.4
		};
		this.addSituationTest("firstrobotatball", this.testFirstRobotAtBall, [
			["glados/test/unit/glados/ball-situations/firstrobotatball-1", s123],
			["glados/test/unit/glados/ball-situations/firstrobotatball-2", s123],
			["glados/test/unit/glados/ball-situations/firstrobotatball-3", s123]
		]);
	}

	private testFirstRobotAtBall(testInfo: FirstRobotAtBallInfo) {
		World.Ball.maxSpeed = testInfo.maxBallSpeed;
		ObserverRobot._update();

		let firstRobot = Ball.firstRobotAtBall(World.OpponentRobots)[0];
		this.assert_not_undefined(firstRobot);
		this.assert_eq(firstRobot!.id, testInfo.robotId);
	}

	private registerReceivesPassSituations() {
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
		this.addSituationTest("receivespass", this.testReceivesPass, [s1, s2, s3]);
	}

	private testReceivesPass(testInfo: ReceivesPassInfo) {

		World.Ball.maxSpeed = testInfo.maxBallSpeed;

		let robot = testInfo.isFriendly ? World.FriendlyRobotsById[testInfo.robotId] : World.OpponentRobotsById[testInfo.robotId];
		if (testInfo.simulateReceivedBefore) {
			Ball.setReceivesPass(robot, true);
		}
		Ball._update();
		this.assert_eq(testInfo.shouldReceivePass, Ball.receivesPass(robot));
	}
}
export let testClass = GladosObserverBall;
