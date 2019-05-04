import * as Const from "base/constants";
import * as debug from "base/debug";
import * as Field from "base/field";
import { normalizeAngle } from "base/geom";
import * as MathUtil from "base/mathutil";
import * as Referee from "base/referee";
import { Robot as OpponentRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

// import { MessageType } from "glados/control/messaging";
import { Shoot } from "glados/task/ability/shoot";
import { Agent, Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";


// const G = World.Geometry;


export class PenaltyShootoutGoal extends Task {
	private _shoot: Shoot;
	private _ball: {pos: Position, speed: Vector, radius: number};
	private _dest: Position;

	constructor(agent: Agent, dest: Position, ball: {pos: Position, speed: Vector, radius: number} = World.Ball) {
		super(agent);
		this._shoot = new Shoot(this._robot, this._messaging, this.setMainAttackerParameters);
		// this._pos = pos;
		this._ball = ball;
		this._dest = dest;
	}
	run() {
		let robot = this._robot;
		let ball = this._ball;
		let obstacleTable : PathHelper.PathHelperParameters = {
			ignoreBall : true,
			ignorePass : true,
			ignoreDefenseArea: true,
			ignoreOpponentDefenseArea: false,
		};
		PathHelper.setDefaultObstaclesByTable(robot.path, robot, obstacleTable);
		let r = this._dest - robot.pos;
		let s = r.setLength(Const.maxBallSpeed) - ball.speed;
		if (Math.abs(normalizeAngle(s.angle() - robot.dir)) < 1 * Math.PI / 180) {
			robot.shoot(Infinity);
		}
		let pos = ball.pos + ball.speed * 0.5;
		r = this._dest - robot.pos;
		s = r.setLength(Const.maxBallSpeed) - ball.speed;
		pos += s.copy().setLength(- robot.shootRadius - ball.radius);
		robot.trajectory.update(ToTarget, pos, s.angle(), undefined, ball.speed * 1.1);
		robot.setDribblerSpeed(0.5);
	}
}
