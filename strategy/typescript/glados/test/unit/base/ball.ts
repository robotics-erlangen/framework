import { Ball } from "base/ball";
import * as Constants from "base/constants";
import * as Coordinates from "base/coordinates";
import { Robot } from "base/robot";
import { Position, Speed, Vector } from "base/vector";
import * as World from "base/world";

import { UnitTest } from "glados/test/unit/unittest";

export class BaseBall extends UnitTest {
	constructor() {
		super();
		Coordinates._setIsBlue(true);
		this.addTest("toString", this.testToString);
		this.addTest("update", this.testUpdate);
		this.addTest("speed tracking", this.testSpeedTracking);
		this.addTest("speed tracking without robot", this.testSpeedTrackingWithoutRobot);
	}

	public static getOverlays() {
		let plot = { addPlot: function() {} };
		return ["base/plot", plot];
	}

	private testToString() {
		let ball = new Ball();
		this.assert_equal(ball._toString(), "Ball(pos = ( 0.000,  0.000), speed = 0.0)");
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
		let robot = new Robot(3);
		// just a random value
		let time = 1234;
		this.assert_equal(ball.maxSpeed, 0);

		let ballPos = new Vector(0, 0);
		let robotPos = new Vector(0, 0);
		robot.pos = robotPos;
		let ballSpeed = new Vector(2, 0.0);
		for (let i = 0; i < 4; i++) {
			ball._update(this.ballData(ballPos, ballSpeed, 0, 0), time, undefined, [robot]);
		}
		this.assert_equal(ball.framesDecelerating, 3);
		this.assert_equal(ball.maxSpeed, ballSpeed.length());

		// stop ball
		ballSpeed = new Vector(0, 0);
		ball._update(this.ballData(ballPos, ballSpeed, 0, 0), time);
		this.assert_equal(ball.framesDecelerating, 4);

		ballSpeed = new Vector(0.5, 0);
		for (let i = 0; i < 4; i++) {
			ball._update(this.ballData(ballPos, ballSpeed, 0, 0), time, undefined, [robot]);
		}
		this.assert_equal(ball.framesDecelerating, 3);
		this.assert_equal(ball.maxSpeed, ballSpeed.length());

		// stop ball
		ballSpeed = ballSpeed.withX(ballSpeed.x * World.BallModel.BallSwitchRatio - 0.01);
		ball._update(this.ballData(ballPos, ballSpeed, 0, 0), time);
	}

	private testSpeedTrackingWithoutRobot() {
		let ball = new Ball();
		let robot = new Robot(3);
		// just a random value
		let time = 1234;
		this.assert_equal(ball.maxSpeed, 0);

		let ballPos = new Vector(0, 0);
		let robotPos = new Vector(2, 3);
		robot.pos = robotPos;
		let ballSpeed = new Vector(2, 0.0);
		for (let i = 0; i < 4; i++) {
			ball._update(this.ballData(ballPos, ballSpeed, 0, 0), time, undefined, [robot]);
		}
		this.assert_equal(ball.framesDecelerating, 3);
		this.assert_not_equal(ball.maxSpeed, ballSpeed.length());
	}
}
export let testClass = BaseBall;
