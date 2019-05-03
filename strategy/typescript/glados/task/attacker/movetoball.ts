import { Position, Speed, Vector } from "base/vector";
import * as World from "base/world";

import { Agent, Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";

import * as debug from "base/debug";
import { AbsTime, RelTime } from "base/timing";
import * as Physics from "glados/observer/physics";



const obstacleTable : PathHelper.PathHelperParameters = {
	ignoreBall : true,
	ignorePass : true,
	ignoreDefenseArea: true,
	ignoreOpponentDefenseArea: false,
};
interface Ball {pos: Position; radius: number; speed: Speed; maxSpeed: number;}
export class MoveToBall extends Task {
	private _ball : Ball;
	private _viewdir : Vector;
	private _startTime : AbsTime;
	private _lastTime : RelTime | undefined;

	constructor(agent: Agent, viewDir : Vector, ball : Ball = World.Ball) {
		super(agent);
		this._ball = ball;
		this._viewdir = viewDir.normalize();
		this._startTime = World.Time;
	}

	run() {
		let robot = this._robot;
		let ball = this._ball;
		PathHelper.setDefaultObstaclesByTable(robot.path, robot, obstacleTable);

		if (robot.pos.distanceTo(ball.pos) < ball.radius + robot.radius + 0.01) {
			let pos = ball.pos - this._viewdir * (robot.shootRadius);
			robot.trajectory.update(ToTarget, pos, this._viewdir.angle(), undefined, ball.speed * 1.1 + this._viewdir * 0.1, undefined, true);
		}
		else {
			let timeSinceStart = World.Time - this._startTime;
			let minTime = Physics.robotTimeToBall(robot, ball, World.Geometry.OpponentGoal, ball.speed.length(), this._lastTime);
			this._lastTime = minTime;
			debug.set("ttb", minTime+timeSinceStart);
			ball = Physics.ballAtTime(ball, minTime);
			let pos = ball.pos - this._viewdir * (robot.shootRadius + ball.radius);
			robot.trajectory.update(ToTarget, pos, this._viewdir.angle(), undefined, ball.speed * 1.2);
		}
	}
}