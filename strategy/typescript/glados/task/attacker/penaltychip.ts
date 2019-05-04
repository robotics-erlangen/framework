
import * as Constants from "base/constants";
import * as debug from "base/debug";
import { Robot } from "base/robot";
import { Position, Speed, Vector } from "base/vector";
import * as World from "base/world";

import { ellipticDistance } from "glados/observer/ball";
import { Shoot } from "glados/task/ability/shoot";
import { Agent, Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";


const G = World.Geometry;

const chipGradient = 1;
const g = 10;
const robotHeight = Constants.maxRobotHeight;
const robotRadius = Constants.maxRobotRadius;
const maxReliableDistance = 3.5;
const goalBallheight = G.GoalHeight - (World.Ball.radius * 2 + 0.04);
const wrongCalib = 1.0;
let blockmodes : boolean[] = [true, false, false];

const bufferTime = 0.00;
// -- "y(t)=-g*t*t + chipGradient*t*v_x"
// -- "t_ges = d / v_x"
// -- "y(t)=-g*t*t + chipGradient*t/t_ges*d"
// -- "t_ges = sqrt(chipGradient * d / g)"
// -- "0 = -g*t*t + chipGradient * t * v_x - robotHeight"
// -- "v_x = sqrt(g*d/chipGradient)"
// -- "(chipGradient*v_x/2g) - sqrt((chipGradient * v_x /2g)^2 - robotHeight/g) = t_0"
// -- "(sqrt(d*chipGradient) - sqrt(d*chipGradient - 4*robotHeight))/sqrt(g)/2 = t_0"

function v_x(d: number) {
	return Math.sqrt(g * d / chipGradient);
}
function t_ges(d: number) {
	return d / v_x(d);
}
function maxHeight(d: number) {
	return (d * chipGradient) / 4;
}
function t_0(d: number, height: number = robotHeight) {
	return (Math.sqrt(maxHeight(d)) - Math.sqrt(maxHeight(d) - height)) / Math.sqrt(g);
}
function p_x_t0(d: number, height: number = robotHeight) {
	return v_x(d) * t_0(d, height);
}

const obstacleTable: PathHelper.PathHelperParameters = {
	ignorePass: true,
	ignoreBall: true
};

export class PenaltyChip extends Task {
	private _shoot: Shoot;
	private _ball: {pos: Position, speed : Speed, radius: number, time: number};
	private _mode: number;


	constructor(agent: Agent, ball: any, mode: number) {
		super(agent);
		this._ball = <{pos: Position, speed : Speed, radius: number, time: number}> ball;
		this._mode = mode;
		this._shoot = new Shoot(this._robot, this._messaging, this.setMainAttackerParameters);

	}

	run() {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);
		let shootlength = PenaltyChip.distanceMode(this._mode, this._ball);
		debug.set("chip distance", shootlength);
		this._robot.setDribblerSpeed(0.5 + this._robot.speed.length() / (5 * 2));
		this._robot.chip(shootlength * wrongCalib);
		let aim = getShotVector(this._ball, this._robot).angle() - (G.OpponentGoal - this._robot.pos).angle();
		let dir = this._robot.dir - aim / 10;


		let pos = this._robot.pos + (G.OpponentGoal - this._robot.pos).setLength(0.7);
		this._robot.trajectory.update(ToTarget, pos, dir);
	}

	private static distanceMode(n: number, ball: {pos: Position}) {
		let distance = ball.pos.distanceTo(G.OpponentGoal);
		if (n === 1) {
			return Math.min(distance - 0.05, maxReliableDistance);
		} else if (n === 2) {
			return Math.min(distance - 0.05, maxReliableDistance) / (1 + Constants.floorDamping);
		} else {
			return Math.min(distance / 2 , maxReliableDistance);
		}
	}

	static check(ball: {pos: Position, speed: Vector, radius: number}, robot: Robot) {
		let keeper = World.OpponentKeeper;
		if (keeper == undefined) {
			return false;
		}
		let failed = checkAngle(ball, robot);
		if (failed) {
			debug.set("PenaltyChip", failed);
			return false;
		}
		failed = checkBall(robot, ball);
		if (failed) {
			debug.set("PenaltyChip", failed);
			return false;
		}
		let distance = this.distanceMode(1, ball);
		failed = checkShot(distance, robot, ball, keeper);
		if (failed) {
			debug.set("PenaltyChip1", failed);
			return false;
		}
		failed = checkBounces(distance, ball);
		if (failed || blockmodes[1]) {
			distance = this.distanceMode(2, ball);
			failed = checkShot(distance, robot, ball, keeper);
			if (failed) {
				debug.set("PenaltyChip2", failed);
				return false;
			}
			failed = checkBounces(distance, ball);
			if (failed || blockmodes[2]) {
				distance = this.distanceMode(3, ball);
				failed = checkShot(distance, robot, ball, keeper);
				if (failed) {
					debug.set("PenaltyChip3", failed);
					return false;
				}
				failed = checkBounces(distance, ball);
				if (failed) {
					debug.set("PenaltyChip3", failed);
					return false;
				}
				if (blockmodes[3]) {
					debug.set("PenaltyChip3", "mode blocked");
					return false;
				}
				return 3;
			}
			return 2;
		}
		return 1;
	}
}
function checkAngle(ball: {speed: Vector}, robot: Robot) {
	let toLeftPost = G.OpponentGoal - new Vector(G.GoalWidth / 2 - 0.06, 0) - robot.pos;
	let toRightPost = G.OpponentGoal + new Vector(G.GoalWidth / 2 - 0.06, 0) - robot.pos;
	let minchipDistance = 1;
	let speedSq = g * minchipDistance / chipGradient;
	let shotSpeedSq = speedSq - ball.speed.lengthSq();
	let shotVector = Vector.fromAngle(robot.dir).setLength(Math.sqrt(shotSpeedSq));
	let result = ball.speed + shotVector;
	if (!result.insideSector(toRightPost, toLeftPost)) {
		return "fail angle";
	}
	// -- if not robot.speed:insideSector(toRightPost, toLeftPost) {
	// -- 	return "fail angle robot speed"
	// -- }
	// -- if not ball.speed:insideSector(toRightPost, toLeftPost) {
	// -- 	return "fail angle ball"
	// -- }
	return false;
}
function checkBall(robot: Robot, ball: {pos: Position, radius: number}) {
	if (ellipticDistance(robot, ball.pos) > ball.radius + 0.02) {
		return "fail has ball";
	}
	return false;
}

function checkBounces(distance: number, ball: {pos: Position}) {
	let length2 = distance * Constants.floorDamping;
	let remainingDist = ball.pos.distanceTo(G.OpponentGoal) - distance;
	if (remainingDist < length2) {
		if (maxHeight(length2) > robotHeight &&
				p_x_t0(length2, goalBallheight) < remainingDist &&
				length2 - p_x_t0(length2, goalBallheight) > remainingDist) {
			return "2nd bounce too high";
		}
	}
	let length3 = length2 * Constants.floorDamping;
	remainingDist = remainingDist - length2;
	if (remainingDist < length3) {
		if (maxHeight(length3) > robotHeight &&
				p_x_t0(length3, goalBallheight) < remainingDist &&
				length3 - p_x_t0(length3, goalBallheight) > remainingDist) {
			return "3rd bounce too high";
		}
	}
	return false;
}

function checkShot(distance: number, robot: Robot, ball: {pos: Position}, keeper: Robot) {
	let minDist = p_x_t0(distance);
	if ((minDist + robotRadius) * 2 +  bufferTime * robot.speed.length() > distance) {
		return "fail min distance";
	}
	let toGoal = (G.OpponentGoal - robot.pos).normalize();
	let bufferKeeper = keeper.pos + keeper.speed * bufferTime;
	let bufferSelf = robot.pos + robot.speed * bufferTime;
	let keeperOnLine = (bufferKeeper - bufferSelf).dot(toGoal);
	let t0 = t_0(distance);
	let t1 = t_ges(distance) - t0;
	if (keeperOnLine - robotRadius * 2 + keeper.speed.dot(toGoal) * t0 < minDist) {
		return "fail keeper too close";
	}

	// -- no robotRadius since it doesn't matter if the ball lands on the hull
	if (keeperOnLine - robotRadius + keeper.acceleration.aBrakeFMax * t1 * t1 + keeper.speed.dot(toGoal) * t1 > distance - minDist) {
		return "fail keeper too far";
	}
	if (bufferKeeper.distanceToLineSegment(ball.pos, G.OpponentGoal) > robotRadius + 0.06) {
		return "free shot";
	}
	return false;
}


function getShotVector(ball: {speed: Vector}, robot: Robot) {
	let minchipDistance = 1;
	let speedSq = g * minchipDistance / chipGradient;
	let shotSpeedSq = speedSq - ball.speed.lengthSq();
	let shotVector = Vector.fromAngle(robot.dir).setLength(Math.sqrt(shotSpeedSq));
	return ball.speed + shotVector;
}
