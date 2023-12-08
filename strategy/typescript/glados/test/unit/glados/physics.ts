import * as Constants from "base/constants";
import { FriendlyRobot, Robot } from "base/robot";
import { Vector } from "base/vector";
import * as World from "base/world";

import * as Physics from "glados/observer/physics";
import { UnitTest } from "glados/test/unit/unittest";


export class GladosPhysics extends UnitTest {
	public constructor() {
		super();
		this.addTest("not modifying", this.notModifying);
		this.addTest("ball model matching", this.ballModelMatching);
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

	// a joint test of physics functions and base/robot:shootSpeed
	private ballModelMatching() {

		for (let distance of [0, 0.1, 0.5, 1, 2, 5, 10]) {
			for (let endSpeed of [0, 0.1, 0.5, 1, 2, 5]) {

				const robot = new FriendlyRobot({
					generation: 0,
					year: 2021,
					id: 0
				});

				const shootSpeed = Physics.calculateShootSpeed(robot, endSpeed, distance, true);

				if (shootSpeed >= Constants.maxBallSpeed) {
					continue;
				}

				const ball = {
					pos: new Vector(5, 2),
					speed: new Vector(shootSpeed, 0),
					radius: World.Ball.radius,
					maxSpeed: shootSpeed
				};

				const rollTime = Physics.ballRollTime(ball, distance);
				const ballAtEnd = Physics.ballAtTime(ball, rollTime);

				this.assert_eq_eps(endSpeed, ballAtEnd.speed.x, 0.01);
			}
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
export let testClass = GladosPhysics;
