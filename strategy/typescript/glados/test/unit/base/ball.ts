import { Ball } from "base/ball";
import * as Constants from "base/constants";
import * as Coordinates from "base/coordinates";
import { Robot } from "base/robot";
import { Position, Speed, Vector } from "base/vector";
import * as World from "base/world";

import { UnitTest } from "glados/test/unit/unittest";

export class BaseBall extends UnitTest {
	public constructor() {
		super();
		Coordinates._setIsBlue(true);
		this._addTest("toString", this._testToString);
		this._addTest("update", this._testUpdate);
		this._addTest("speed tracking", this._testSpeedTracking);
		this._addTest("speed tracking without robot", this._testSpeedTrackingWithoutRobot);
	}

	public static getOverlays() {
		let plot = { addPlot: function() {} };
		return ["base/plot", plot];
	}

	private _testToString() {
		let ball = new Ball();
		this._assert_eq(ball.toString(), "Ball(pos = ( 0.000,  0.000), speed = 0.0)");
	}

	private _ballData(pos: Position, speed: Speed, posZ: number, speedZ: number) {
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

	private _testUpdate() {
		let ball = new Ball();
		this._assert_false(ball.isPositionValid());

		let ballPos = new Vector(1, 1);
		let ballSpeed = new Vector(0.5, 0.5);
		ball.update(this._ballData(ballPos, ballSpeed, 2, 3), 1234);
		this._assert_vector_eq(ball.pos, ballPos);
		this._assert_vector_eq(ball.speed, ballSpeed);
		this._assert_eq(ball.posZ, 2);
		this._assert_eq(ball.speedZ, 3);
		this._assert_true(ball.isPositionValid());

		ball.update(undefined, 12345);
		this._assert_false(ball.isPositionValid());
		this._assert_eq(ball.lostSince, 12345);

		ball.update(undefined, 12346);
		this._assert_false(ball.isPositionValid());
		this._assert_eq(ball.lostSince, 12345);

		ball.update(this._ballData(ballPos, ballSpeed, 2, 3), 12346);
		this._assert_true(ball.isPositionValid());
	}

	private _testSpeedTracking() {
		let ball = new Ball();
		let robot = new Robot(3);
		// just a random value
		let time = 1234;
		this._assert_eq(ball.maxSpeed, 0);

		let ballPos = new Vector(0, 0);
		let robotPos = new Vector(0, 0);
		robot.pos = robotPos;
		let ballSpeed = new Vector(2, 0.0);
		for (let i = 0; i < 4; i++) {
			ball.update(this._ballData(ballPos, ballSpeed, 0, 0), time, undefined, [robot]);
		}
		this._assert_eq(ball.framesDecelerating, 3);
		this._assert_eq(ball.maxSpeed, ballSpeed.length());

		// stop ball
		ballSpeed = new Vector(0, 0);
		ball.update(this._ballData(ballPos, ballSpeed, 0, 0), time);
		this._assert_eq(ball.framesDecelerating, 4);

		ballSpeed = new Vector(0.5, 0);
		for (let i = 0; i < 4; i++) {
			ball.update(this._ballData(ballPos, ballSpeed, 0, 0), time, undefined, [robot]);
		}
		this._assert_eq(ball.framesDecelerating, 3);
		this._assert_eq(ball.maxSpeed, ballSpeed.length());

		// stop ball
		ballSpeed = ballSpeed.withX(ballSpeed.x * World.BallModel.BallSwitchRatio - 0.01);
		ball.update(this._ballData(ballPos, ballSpeed, 0, 0), time);
	}

	private _testSpeedTrackingWithoutRobot() {
		let ball = new Ball();
		let robot = new Robot(3);
		// just a random value
		let time = 1234;
		this._assert_eq(ball.maxSpeed, 0);

		let ballPos = new Vector(0, 0);
		let robotPos = new Vector(2, 3);
		robot.pos = robotPos;
		let ballSpeed = new Vector(2, 0.0);
		for (let i = 0; i < 4; i++) {
			ball.update(this._ballData(ballPos, ballSpeed, 0, 0), time, undefined, [robot]);
		}
		this._assert_eq(ball.framesDecelerating, 3);
		this._assert_ne(ball.maxSpeed, ballSpeed.length());
	}
}
export let testClass = BaseBall;
