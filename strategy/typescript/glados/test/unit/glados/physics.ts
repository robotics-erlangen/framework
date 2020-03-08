import { Vector } from "base/vector";

import * as Physics from "glados/observer/physics";
import { UnitTest } from "glados/test/unit/unittest";


export class BaseMessaging extends UnitTest {
	constructor() {
		super();
		this.addTest("not modifying", this.notModifying);
	}

	private getDummyBall(flying: boolean = false) {
		if (flying) {
			return Object.freeze({
				pos: Object.freeze(new Vector(2, 1)),
				speed: Object.freeze(new Vector(0.5, -1)),
				maxSpeed: 4,
				radius: 0.0215,
				posZ: 0.2,
				speedZ: 0.1,
				initSpeedZ: 0.7
			});
		} else {
			return Object.freeze({
				pos: Object.freeze(new Vector(2, 1)),
				speed: Object.freeze(new Vector(0.5, -1)),
				maxSpeed: 4,
				radius: 0.0215,
				posZ: 0,
				speedZ: 0,
				initSpeedZ: 0
			});
		}
	}

	private notModifying() {
		// checks if any of the functions modify the ball they are given
		let ball = this.getDummyBall(false);
		Physics.ballSwitchParameters(ball);
		Physics.ballAtTime(ball, 2);
		Physics.ballAtTimeExperimental(ball, 2);
		Physics.ballTravelledDistance(ball, 2);
		Physics.ballTravelTime(ball, 2);
		Physics.checkedBallTravelTime(ball, Object.freeze(ball.pos + ball.speed * 2));
		Physics.ballRollTime(ball, 2);
		Physics.checkedBallRollTime(ball, Object.freeze(ball.pos + ball.speed * 2));
		Physics.ballStopTime(ball);
		Physics.ballLandPos(ball);


		ball = this.getDummyBall(true);
		Physics.ballSwitchParameters(ball);
		Physics.ballAtTime(ball, 2);
		Physics.ballAtTimeExperimental(ball, 2);
		Physics.ballTravelledDistance(ball, 2);
		Physics.ballTravelTime(ball, 2);
		Physics.checkedBallTravelTime(ball, Object.freeze(ball.pos + ball.speed * 2));
		Physics.ballRollTime(ball, 2);
		Physics.checkedBallRollTime(ball, Object.freeze(ball.pos + ball.speed * 2));
		Physics.ballStopTime(ball);
		Physics.ballLandPos(ball);
	}
}
export let testClass = BaseMessaging;
