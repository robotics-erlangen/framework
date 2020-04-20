import { Ball } from "base/ball";
import * as Constants from "base/constants";
import * as Coordinates from "base/coordinates";
import { Position, Speed, Vector } from "base/vector";

import { UnitTest } from "glados/test/unit/unittest";

export class BaseBall extends UnitTest {
	constructor() {
		super();
		Coordinates._setIsBlue(true);
		this.addTest("toString", this.testToString);
		this.addTest("update", this.testUpdate);
		this.addTest("speed tracking", this.testSpeedTracking);
	}

	public static getOverlays() {
		let plot = { addPlot: function() {} };
		return ["base/plot", plot];
	}

	private testToString() {
		let ball = new Ball();
		this.assert_equal(ball._toString(), "Ball(pos = (0, 0), speed = 0)");
	}

	private ballData(pos: Position, speed: Speed, posZ: number, speedZ: number) {
		let globalPos = Coordinates.Coordinates.toGlobal(pos);
		let globalSpeed = Coordinates.Coordinates.toGlobal(speed);
		return {
			p_x: globalPos.x,
			p_y: globalPos.y,
			p_z: posZ,
			v_x: globalSpeed.x,
			v_y: globalSpeed.y,
			v_z: speedZ
		};
	}

	private testUpdate() {
		let ball = new Ball();
		this.assert_false(ball.isPositionValid());

		let ballPos = new Vector(1, 1);
		let ballSpeed = new Vector(0.5, 0.5);
		ball._update(this.ballData(ballPos, ballSpeed, 2, 3), 1234);
		this.assert_vector_equal(ball.pos, ballPos);
		this.assert_vector_equal(ball.speed, ballSpeed);
		this.assert_equal(ball.posZ, 2);
		this.assert_equal(ball.speedZ, 3);
		this.assert_true(ball.isPositionValid());

		ball._update(undefined, 12345);
		this.assert_false(ball.isPositionValid());
		this.assert_equal(ball.lostSince, 12345);

		ball._update(undefined, 12346);
		this.assert_false(ball.isPositionValid());
		this.assert_equal(ball.lostSince, 12345);

		ball._update(this.ballData(ballPos, ballSpeed, 2, 3), 12346);
		this.assert_true(ball.isPositionValid());
	}

	private testSpeedTracking() {
		let ball = new Ball();
		// just a random value
		let time = 1234;
		this.assert_equal(ball.maxSpeed, 0);

		let ballPos = new Vector(0, 0);
		let ballSpeed = new Vector(2, 0.0);
		for (let i = 0;i < 4;i++) {
			ball._update(this.ballData(ballPos, ballSpeed, 0, 0), time);
		}
		this.assert_equal(ball.framesDecelerating, 3);
		this.assert_equal(ball.maxSpeed, ballSpeed.length());

		// stop ball
		ballSpeed = new Vector(0, 0);
		ball._update(this.ballData(ballPos, ballSpeed, 0, 0), time);
		this.assert_equal(ball.framesDecelerating, 4);

		ballSpeed = new Vector(0.5, 0);
		for (let i = 0;i < 4;i++) {
			ball._update(this.ballData(ballPos, ballSpeed, 0, 0), time);
		}
		this.assert_equal(ball.framesDecelerating, 3);
		this.assert_equal(ball.maxSpeed, ballSpeed.length());

		this.assert_equal(ball.deceleration, Constants.fastBallDeceleration);

		// stop ball
		ballSpeed.x = ballSpeed.x * Constants.ballSwitchRatio - 0.01;
		ball._update(this.ballData(ballPos, ballSpeed, 0, 0), time);
		this.assert_equal(ball.deceleration, Constants.ballDeceleration);
	}
}
export let testClass = BaseBall;
