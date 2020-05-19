import * as Const from "base/constants";
import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as Referee from "base/referee";
import { Robot } from "base/robot";
import { AbsTime, RelTime } from "base/timing";
import { Position, Speed, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import { ellipticDistance, getRealisticBallPos  } from "glados/observer/ball";
import * as Goal from "glados/observer/goal";
import * as Physics from "glados/observer/physics";
import * as ORobot from "glados/observer/robot";
import { Dribble } from "glados/task/attacker/dribble";
import { MoveToBall } from "glados/task/attacker/movetoball";
import { MoveToStaticBall } from "glados/task/attacker/movetostaticball";
import { PenaltyChip } from "glados/task/attacker/penaltychip";
// import { PenaltyShootout as Pass } from "glados/task/attacker/penaltyshootout";
import { PenaltyShootoutGoal as ShootGoal } from "glados/task/attacker/penaltyshootoutgoal";
import { StopAttack } from "glados/task/attacker/stopattack";
import { MoveToPos } from "glados/task/shared/movetopos";


let G = World.Geometry;

let DISTANCE_TO_DEFENSE_AREA = 0.6; // the furthest we'll go before we shoot
let DRIBBLING_DISTANCE = 0.035; // Ball and Robot must be at least this far apart to reset dribbling

function getKeeperTime(post: Position, turntime: RelTime, ball: {pos: Position, speed: Speed, radius: number, maxSpeed: number}, keeper: Robot) {
	let pos = ball.pos + ball.speed * turntime;
	let startspeed = Const.maxBallSpeed - Const.fastBallDeceleration * turntime;
	let shootdir = (post - pos).normalized();
	let startpos = pos - shootdir * ((Const.maxBallSpeed + startspeed) / 2 * turntime);

	let startBall = {pos : startpos, speed : shootdir * startspeed,
			radius : ball.radius, maxSpeed : Const.maxBallSpeed};
	if (ball.speed.lengthSq() > 3 * 3) {
		startBall = ball;
	}
	vis.addPath("a/a/penaltyshootout: startBall", [startpos, pos], vis.colors.green);
	vis.addPath("a/a/penaltyshootout: startBall", [pos, post], vis.colors.black);
	let time: number = Physics.robotTimeToBall(keeper, startBall, G.OpponentGoal,0);
	if (time !== Infinity) return 0;
	let dir = shootdir.perpendicular();
	let r = (keeper.pos - startpos).dot(dir);
	let f = (r < 0 ? -1 : 1);
	r = Math.max(f * r - Const.maxRobotRadius, 0.001);
	let v = keeper.speed.dot(dir) * f;
	let a = - keeper.acceleration.aSpeedupSMax;
	time = (-v + Math.sqrt(v * v - 4 * a * r)) / (2 * a);
	// }
	return time;
}

export class PenaltyShootout extends Behavior {
	private _penaltyStartTime: number | undefined = undefined;
	private _contactPoint: Position | undefined = undefined;
	private _shootGoalFlag: boolean = false;
	private _forceDesperate: boolean = false;
	private _changeContact: boolean = false;
	private _baseDribblePos: Position = new Vector(0, G.FieldHeightHalf);
	private _addPos: Position = new Vector(0, 0);
	private _state: string | undefined;
	private _futureKeeper: {pos: Position, speed: Speed, radius: number} = {pos: G.OpponentGoal, speed: new Vector(0,0.1), radius: 0.09};
	private _ball = {pos : getRealisticBallPos(), speed : World.Ball.speed, radius : World.Ball.radius, time : World.Time, maxSpeed: 0, quality : 1};
	private _dribblePos: Position | undefined = undefined;
	private _shootPos: Position = G.OpponentGoal;

	_stop() {

		this._penaltyStartTime = undefined;
		this._contactPoint = undefined;
		this._shootGoalFlag = false;
		this._forceDesperate = false;
		this._changeContact = false;
		this._baseDribblePos = new Vector(0, G.FieldHeightHalf);
		this._addPos = new Vector(0, 0);
		this._state = undefined;
		this._futureKeeper = {pos: G.OpponentGoal, speed: new Vector(0,0.1), radius: 0.09};
		this._ball = {pos : getRealisticBallPos(), speed : World.Ball.speed, radius : World.Ball.radius, time : World.Time, maxSpeed: 0, quality : 1};
		this._dribblePos = undefined;
	}

	public check(): boolean {
		let mainAttacker = this._messaging.receiveTrainer(MessageType.mainAttacker) === this._robot;
		let isPenalty = World.RefereeState === "PenaltyOffensivePrepare" || World.RefereeState === "PenaltyOffensive";
		let isShootout = World.GameStage === "PenaltyShootout";
		return mainAttacker && isShootout && (isPenalty || this._checkPenaltyOngoing());
	}

	private _checkPenaltyOngoing(): boolean {
		return this._penaltyStartTime != undefined && World.Time - this._penaltyStartTime < 15 && !Referee.isStopState();
	}

	private _updateDribbling() {
		if (this._contactPoint == undefined && ORobot.hadBall(this._robot, 0)) {
			this._contactPoint = this._robot.pos;
			this._changeContact = true;
		} else if (this._contactPoint != undefined &&
				getRealisticBallPos().distanceTo(this._robot.pos) > DRIBBLING_DISTANCE + this._robot.radius + World.Ball.radius) {
			this._contactPoint = undefined;
			this._changeContact = true;
		} else {
			this._changeContact = false;
		}
	}

	private angleUncertanty: number = 3 * Math.PI / 180;
	private turnspeed: number = 1;

	private _checkFreeGoal() {
		if (World.OpponentKeeper === undefined) {
			return [0.5, 0, 0];
		}
		let keeper = World.OpponentKeeper;
		let robot = this._robot;
		let ball = this._ball;
		let toleftPost = (G.OpponentGoalLeft - robot.pos).rotated(-this.angleUncertanty);
		let torightPost = (G.OpponentGoalRight - robot.pos).rotated(this.angleUncertanty);
		let anglediffleft = geom.normalizeAngle(toleftPost.angle() - robot.dir);
		let anglediffright = geom.normalizeAngle(torightPost.angle() - robot.dir);
		let turntimeLeft = Math.abs(anglediffleft) / this.turnspeed;
		let turntimeRight = Math.abs(anglediffright) / this.turnspeed;


		let timeLeft = getKeeperTime(robot.pos + toleftPost, turntimeLeft, ball, keeper);
		let timeRight = getKeeperTime(robot.pos + torightPost, turntimeRight, ball, keeper);

		if (timeRight === 0 && timeRight === 0) {
			return [false, 0, 0];
		}
		let weightLeft = timeLeft / (turntimeLeft + 0.2);
		let weightRight = timeRight / (turntimeRight + 0.2);
		let weight = weightRight / (weightLeft + weightRight);
		if (Number.isNaN(weight)) {
			debug.set("._.", String(timeLeft));
			debug.set("D;", String(timeRight));
		}
		if (weight > 0.5) {
			this._shootPos = robot.pos + torightPost;
		} else {
			this._shootPos = robot.pos + toleftPost;
		}
		return [weight,timeRight,timeLeft];
	}
	private _updateShootGoal() {
		if (World.OpponentKeeper  &&  World.OpponentKeeper.pos) {
			this._futureKeeper = {pos : World.OpponentKeeper.pos, speed: World.OpponentKeeper.speed, radius : World.OpponentKeeper.radius};
		}
		let lastContact = this._contactPoint;
		let addDistance = lastContact ? Math.max(0, lastContact.distanceTo(getRealisticBallPos()) - 0.5) * 3 : 0.2;
			this._futureKeeper.pos = this._futureKeeper.pos + (World.OpponentKeeper || this._futureKeeper).speed * 0.4;
		if (this._state === "pass") {
			this._futureKeeper.pos = this._futureKeeper.pos + (this._robot.pos - this._futureKeeper.pos).withLength(this._robot.speed.length() / 3);
		}

		debug.push("Shootgoal Criterias");
		if (this._penaltyStartTime != undefined) {
			let timeSinceStart = World.Time - this._penaltyStartTime;
			let criteriaTime = timeSinceStart > 8;
			debug.push("Time Criteria (8s)", String(criteriaTime));
			debug.set("timeSinceStart", timeSinceStart);
			debug.pop();

			let ballPosY = getRealisticBallPos().y;
			let distanceToGoalLine = (World.RULEVERSION === "2017" ? G.DefenseRadius : G.DefenseHeight) + DISTANCE_TO_DEFENSE_AREA;
			let criticalMark = G.FieldHeightHalf - distanceToGoalLine;
			let criteriaPos = ballPosY + addDistance > criticalMark;
			debug.push("Position Criteria", String(criteriaPos));
			debug.set("ballPosY", ballPosY);
			debug.set("addDistance", addDistance);
			debug.set("DistanceToGoalLine", distanceToGoalLine);
			debug.set("CriticalMark", criticalMark);
			debug.pop();
			vis.addCircle("a/a/penaltyshootout: futureKeeper", this._futureKeeper.pos, 0.1, vis.colors.green, false);

			let [weight,tright,tleft] = this._checkFreeGoal();
			debug.push("Free Goal Criteria", String(weight));
			debug.set("TimeRight", String(tright));
			debug.set("TimeLeft", String(tleft));
			debug.pop();

			if (this._shootGoalFlag  ||  criteriaPos  ||  criteriaTime  ||  // criteriaAngle ||
					(weight !== false && ellipticDistance(this._robot, this._ball.pos) < this._ball.radius + 0.02)) {
				this._shootGoalFlag = true;
			}
		} else {
			debug.push("Time Criteria (8s)");
			debug.set("time", "not set yet");
			debug.pop();
		}
		debug.pop();
	}

	private _updateBall() {
		let ball = this._ball;
		let quality = World.Ball.detectionQuality - ball.quality;
		let robot = this._robot;
		let minDistance = robot.radius + ball.radius - 0.01;
		let ballPos = ball.pos;
		let robotPos = robot.pos;
		let t_now = World.Time;
		debug.set(".ballVisible", World.Ball.isPositionValid());
		debug.set(".ballQuality", String(World.Ball.detectionQuality));
		if (World.Ball.isPositionValid()) {
			if (robotPos.distanceToSq(getRealisticBallPos()) < minDistance * minDistance || quality < 0) {
				if (ellipticDistance(robot, ball.pos) < ball.radius + 0.01) {
					let dribblerPos = robotPos + Vector.fromPolar(robot.dir, robot.shootRadius + ball.radius);
					let a = 0.9;
					ballPos = (ballPos * a) + (dribblerPos * (1 - a));
					// ballPos = (ballPos * a);
				}
				let alpha = 0.8;
				let relSpeed = ball.speed - robot.speed;
				let reflect = relSpeed + (ballPos - robotPos) * (ballPos - robotPos).dot(relSpeed) / robotPos.distanceToSq(ballPos) * -2;
				ball.speed = robot.speed * alpha + reflect * (1 - alpha);
				ball.pos = ball.speed * (t_now - ball.time) + ballPos;
				ball.quality = World.Ball.detectionQuality * 0.5 + ball.quality * 0.5;
			} else {
				ball.pos = getRealisticBallPos();
				ball.speed = World.Ball.speed;
				ball.quality = World.Ball.detectionQuality;
			}
		} else {
			ball.pos = (t_now - ball.time) * ball.speed + ballPos;
		}
		ball.time = t_now;
		vis.addCircle("a/a/penalty: ball", ball.pos, 0.05, vis.colors.orchid, true);
	}

	_updateTask() : TaskAssignment<typeof ShootGoal> | TaskAssignment<typeof MoveToStaticBall> |
			TaskAssignment<typeof MoveToBall> | TaskAssignment<typeof StopAttack> |
			TaskAssignment<typeof PenaltyChip> | TaskAssignment<typeof Dribble> |
			TaskAssignment<typeof MoveToPos> {
		this._updateBall();
		this._updateDribbling();
		this._updateShootGoal();
		debug.set("ShootGoalFlag", this._shootGoalFlag);
		let lastContact = this._contactPoint;
		let robotPos = this._robot.pos;
		let freeway : number = this._state === "pass" ? 0.1 : 0;
		let distanceToContact;
		if (lastContact) {
			vis.addCircle("1test", lastContact, 1, vis.colors.green, false);
			distanceToContact = lastContact.distanceTo(this._ball.pos);
		} else {
			distanceToContact = 0;
		}

		if (World.RefereeState === "PenaltyOffensive" && this._penaltyStartTime == undefined) {
			this._penaltyStartTime = World.Time;
		}
		let chipMode = PenaltyChip.check(this._ball, this._robot);
		if (World.RefereeState === "PenaltyOffensivePrepare") {
			return [MoveToStaticBall, [Math.PI / 2, 0.1]];
		} else if (distanceToContact > 1 - 0.05) {
			// return [StopAttack];
			return [ MoveToPos, [World.Ball.pos - new Vector(0, 0.5), (new Vector(0, -1)).angle(),
				undefined, undefined, undefined, undefined, undefined, undefined, true]];
		} else if (chipMode !== false) {
			debug.set("chipMode", chipMode);
			return [PenaltyChip, [this._ball, chipMode]];
		} else if (!lastContact  ||  robotPos.distanceTo(this._ball.pos) > this._robot.radius + World.Ball.radius + freeway) {
			return [MoveToBall, [G.OpponentGoal - this._robot.pos]];
		} else if (this._shootGoalFlag) {
			return [ShootGoal,[this._shootPos, this._ball]];// , nil, true
		} else {

			this._state = "dribble";
			let keeperPos = (World.OpponentKeeper || this._robot).pos;
			let rate = 0.02 * robotPos.distanceTo(keeperPos);
			if (keeperPos.x < 0) {
				this._addPos.x = (this._addPos.x + rate) / (1 + Math.abs(robotPos.x - keeperPos.x));
			} else {
				this._addPos.x = (this._addPos.x - rate) / (1 + Math.abs(robotPos.x - keeperPos.x));
			}
			let dribblePoint = this._baseDribblePos + this._addPos;
			let intersection = Field.intersectRayDefenseArea(dribblePoint, robotPos - dribblePoint, 0.2, false)[0];
			if (intersection) {
				dribblePoint = intersection;
			}
			if (this._dribblePos == undefined) {
				this._dribblePos = dribblePoint;
			} else {
				this._dribblePos.x = dribblePoint.x;
				this._dribblePos.y = dribblePoint.y;
			}
			return [Dribble, [this._dribblePos]];
		}
	}
}
