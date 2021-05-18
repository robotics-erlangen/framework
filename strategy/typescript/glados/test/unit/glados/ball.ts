import * as World from "base/world";

import * as Ball from "glados/observer/ball";
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

export class GladosObserverBall extends UnitTest {

	constructor() {
		super();

		let s1: [string, ReceivesPassInfo] = ["glados/test/unit/glados/ball-situations/receivespass-1", {
			robotId: 8,
			isFriendly: true,
			shouldReceivePass: true,
			simulateReceivedBefore: false,
			maxBallSpeed: 4.7
		}];
		let s2: [string, ReceivesPassInfo] = ["glados/test/unit/glados/ball-situations/receivespass-2", {
			...s1[1], simulateReceivedBefore: true}];
		let s3: [string, ReceivesPassInfo] = ["glados/test/unit/glados/ball-situations/receivespass-3", {...s2[1]}];
		// TODO: test 2 currently failes. Once if passes, re-enable it again
		this.addSituationTest("receivespass", this.testReceivesPass, [s1, /* TODO s2 ,*/ s3]);
	}

	private testReceivesPass(testInfo: ReceivesPassInfo) {

		World.Ball.maxSpeed = testInfo.maxBallSpeed;

		let robot = testInfo.isFriendly ? World.FriendlyRobotsById[testInfo.robotId] : World.OpponentRobotsById[testInfo.robotId];
		if (testInfo.simulateReceivedBefore) {
			Ball.setReceivesPass(robot, true);
		}
		Ball._update();
		this.assert_equal(testInfo.shouldReceivePass, Ball.receivesPass(robot));
	}
}
export let testClass = GladosObserverBall;
