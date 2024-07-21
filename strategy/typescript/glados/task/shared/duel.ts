import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import { Robot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { MessageType } from "glados/control/messaging";
import * as Ball from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import * as ObserverRobot from "glados/observer/robot";
import { Task } from "glados/task/base";
import { CurvedMaxAccel } from "glados/trajectory/curvedmaxaccel";
import { Direct } from "glados/trajectory/direct";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as UtilAttack from "glados/util/attack";
import * as UtilDefense from "glados/util/defense";


const STAY_BEHIND_OPP_ANGLE = geom.degreeToRadian(120);
const STAY_BEHIND_OPP_HYSTERESIS = geom.degreeToRadian(10);
const SIDEWARDS_ANGLE_MAX = geom.degreeToRadian(30);
const SIDEWARDS_ANGLE_SCALE = 1 / 3;

const BLOCK_DIST_MAX = 0.08;
const BLOCK_DIST_HYSTERESIS = 0.02;

const BLOCK_POS_ALPHA = 0.1;
const BLOCK_POS_PRECISION = 0.01;

const DEFENSE_AREA_MIN_DISTANCE = 0.04;

const BEFORE_OPPONENT_HYSTERESIS = 0.2;
const BEFORE_OPPONENT_TIME = 0.3;

const CLOSE_TO_OPP_HYSTERESIS = 0.09;
const CLOSE_TO_OPP_DISTANCE = 0.5;


const OPPONENT_DEFENSE_AREA_MIN_DISTANCE = 0.1;

export class Duel extends Task {
	private _opposer: Robot | undefined;
	private _defendedOpponentMessageSent: boolean = false;
	private _blockingBall: boolean = false;
	private _oldPosition: Position | undefined;
	private _stayBehindOpp: boolean = false;
	private _beforeOpp: boolean = false;
	private _lastCloseToOpp: boolean = false;
	private _futureBall: Position | undefined;
	private _rotating: boolean = false;
	private _isMainAttacker: boolean = false;
	private _lastDefendGoal = false;

	public run() {
		// search for the best duel target (can be nil!)
		// 1. get the opponent ball owner, if possible
		// 2. get the opponent, that reaches the ball first inside the field boundaries
		this._opposer = Ball.opponentBallOwner();
		if (this._opposer == undefined) {
			this._opposer = Ball.firstRobotAtBall(World.OpponentRobots)[0];
		}

		this._isMainAttacker = this._messaging.receiveTrainer(MessageType.mainAttacker) === this._robot;
		// notify all that we are duelling
		let distToOpp = this._opposer != undefined ? this._robot.pos.distanceTo(this._opposer.pos) : Infinity;
		this._defendedOpponentMessageSent = distToOpp < (this._defendedOpponentMessageSent ? 0.6 : 0.3);
		if (this._defendedOpponentMessageSent) {
			this._messaging.sendBroadcast(MessageType.defendedOpponent, <Robot> this._opposer);
		}
		if ((this._opposer && this._isMainAttacker) || this._defendedOpponentMessageSent) {
			this._messaging.sendBroadcast(MessageType.dueledOpponent, <Robot> this._opposer);
		}

		if ((this._opposer != undefined) && this._blockingBall && ObserverRobot.hadBall(this._robot, 0.1)) {
			this._contest();
		} else {
			this._moveToBall();
			debug.set("duel-state", "move to ball");
		}
	}

	private _contestRotate() {
		// decide if we should rotate cw or ccw
		let toOpponentDir = (this._opposer as Robot).pos - this._robot.pos;
		let intersection = geom.intersectLineLine(
				this._robot.pos, toOpponentDir, World.Geometry.FriendlyGoal, new Vector(1, 0))[0];
		let ccw = intersection ? -MathUtil.sign(intersection.x) : -1; // negative = ccw, positive = cw
		let toBall = World.Ball.speed + (Ball.getRealisticBallPos() - this._robot.pos).withLength(0.4);
		this._robot.setDribblerSpeed(0.8);
		this._robot.trajectory.update(Direct, toBall, undefined, ccw * 2 * Math.PI); // 1 turn per second
	}

	private _contestPush() {
		let viewDir = (Ball.getRealisticBallPos() - World.Geometry.FriendlyGoal).angle();
		let destinationPos = Ball.getRealisticBallPos() - Vector.fromPolar(viewDir, 0.04);
		let obstacleTable = {
			ignoreBall: true,
			task: this,
			ignoreOpponentRobots: true,
			useCMAPathFinding: true
		};
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);
		this._robot.setDribblerSpeed(1);
		this._robot.trajectory.update(CurvedMaxAccel, destinationPos, viewDir);
	}

	private _contest() {
		this._rotating = this._rotating && Ball.getRealisticBallPos().y > -World.Geometry.FieldHeightHalf / 3
			|| Ball.getRealisticBallPos().y > -World.Geometry.FieldHeightHalf / 6;

		if (this._rotating) {
			debug.set("duel-state", "contest - rotate");
			this._contestRotate();
		} else {
			debug.set("duel-state", "contest - push");
			this._contestPush();
		}

		if (this._robot.dir > 0 && this._robot.dir < Math.PI && Ball.getRealisticBallPos().y > 0.2
				&& !ObserverRobot.hadBall(<Robot> this._opposer, 0)) {
			this._robot.shoot(7.5);
		}

		// send the position of the ball
		if (this._isMainAttacker) {
			this._messaging.sendBroadcast(MessageType.attackPosition, Ball.getRealisticBallPos());
		}
		this._checkBlockingBall();
	}

	private _moveToNearBlock(closestOpponentRobot: Robot): Position {
		let futureBall = <Position> this._futureBall;
		// all decisions are made to keep the own goal covered
		let baseDir = (futureBall - World.Geometry.FriendlyGoal).angle();
		let oppViewDir = (futureBall - closestOpponentRobot.pos).angle();
		let oppDir = geom.normalizeAngle(oppViewDir - baseDir);

		if (Math.abs(oppDir) < Math.PI - STAY_BEHIND_OPP_ANGLE) {
			this._stayBehindOpp = true;
		} else if (Math.abs(oppDir) > Math.PI - STAY_BEHIND_OPP_ANGLE + STAY_BEHIND_OPP_HYSTERESIS) {
			this._stayBehindOpp = false;
		}

		let targetAngle, ballDist;
		if (this._stayBehindOpp) {
			targetAngle = 0;
			// if opponent doesn't exactly look away from our goal, close the gap
			ballDist = this._robot.radius + Math.cos(oppDir) * 2 * closestOpponentRobot.radius + World.Ball.radius;
		} else {
			let sidewardsAngle = Math.min(
				(Math.PI - Math.abs(oppDir)) * SIDEWARDS_ANGLE_SCALE, SIDEWARDS_ANGLE_MAX);
			targetAngle = sidewardsAngle * (-MathUtil.sign(oppDir));
			ballDist = this._robot.radius + World.Ball.radius;
		}

		return futureBall - Vector.fromPolar(baseDir + targetAngle, ballDist);
	}

	private _checkBlockingBall(): [number, number, Robot | undefined, Position | undefined] {
		let [closestOpponentRobot, shortestTimeToBall] = Ball.firstRobotAtBall(World.OpponentRobots);

		let moveTime = ObserverRobot.minTimeToBall(this._robot);
		let minTime = Math.min(moveTime, shortestTimeToBall);
		this._futureBall = Physics.ballAtTime(World.Ball, minTime).pos;
		vis.addCircle("t/duel: future ball", this._futureBall, World.Ball.radius + 0.01, vis.colors.green);

		// pos before the defense area; the possibility of crashing into centerbacks was considered
		// but disregarded because blocking a shot on the goal is more important,
		// and the probabilty of it being the final position is small
		let intersectionDefenseArea = Field.intersectRayDefenseArea(this._futureBall,
				World.Geometry.FriendlyGoal - this._futureBall,
				this._robot.radius + DEFENSE_AREA_MIN_DISTANCE, true)[0];
		let basePos: Position;

		if (intersectionDefenseArea) {
			basePos = intersectionDefenseArea;
		} else {
			basePos = this._robot.pos;
		}

		let distToLine = this._robot.pos.distanceToLineSegment(basePos, this._futureBall);
		if (distToLine <= BLOCK_DIST_MAX) {
			this._blockingBall = true;
		} else if (distToLine > BLOCK_DIST_MAX + BLOCK_DIST_HYSTERESIS) {
			this._blockingBall = false;
		}

		debug.set("moveDest distToLine", distToLine);

		return [moveTime, shortestTimeToBall, closestOpponentRobot, intersectionDefenseArea];

	}

	private _moveToBall() {
		const DEFEND_GOAL_HYSTERESIS = 0.05;
		let [moveTime, shortestTimeToBall, closestOpponentRobot, intersectionDefenseArea] = this._checkBlockingBall();

		debug.set("oppTime", shortestTimeToBall);
		debug.set("moveTime", moveTime);

		// ignore opponent if we are earlier at the ball by some margin
		if (moveTime < shortestTimeToBall - BEFORE_OPPONENT_TIME - BEFORE_OPPONENT_HYSTERESIS) {
			this._beforeOpp = true;
		} else if (moveTime > shortestTimeToBall - BEFORE_OPPONENT_TIME) {
			this._beforeOpp = false;
		}
		if (this._beforeOpp) {
			closestOpponentRobot = undefined;
		}
		// ensure the ball isn't predicted to be behind / inside the opponent
		let minTime = Math.min(moveTime, shortestTimeToBall);

		if (minTime === Infinity) {
			this._futureBall = Ball.getRealisticBallPos();
		}
		let viewDir = (this._futureBall! - this._robot.pos).angle();

		let moveDest: Position;
		if (intersectionDefenseArea != undefined) {

			// calculate new position between ball (regarding robot shootRadius) and the intersection with defense area
			moveDest = this._futureBall! + (intersectionDefenseArea - this._futureBall!).withLength(this._robot.shootRadius + World.Ball.radius);
			let defenseIntersectionRadius = this._robot.radius * 3 + OPPONENT_DEFENSE_AREA_MIN_DISTANCE;
			if (Field.isInOpponentDefenseArea(moveDest, defenseIntersectionRadius)) {
				let opponentDefenseIntersection = Field.intersectRayDefenseArea(moveDest, World.Geometry.FriendlyGoal - moveDest,
														defenseIntersectionRadius, false)[0];
				moveDest = opponentDefenseIntersection || moveDest;
			}
			if (closestOpponentRobot && moveDest.distanceToSq(closestOpponentRobot.pos) < this._robot.shootRadius * this._robot.shootRadius * 2 * 2) {
				let res = geom.intersectLineCircle(moveDest, intersectionDefenseArea - moveDest, closestOpponentRobot.pos, 2 * this._robot.shootRadius)[0];
				if (res) {
					moveDest = res;
				}
			}
			moveDest = UtilDefense.fastestPointInInterval(this._robot, moveDest, intersectionDefenseArea,
							this._oldPosition, BLOCK_POS_PRECISION, BLOCK_POS_ALPHA);
		} else {
			// case if there isn't an intersection with the defense area
			moveDest = this._futureBall! + (this._robot.pos - this._futureBall!).withLength(this._robot.shootRadius + World.Ball.radius);
		}

		// remember position for the next iteration
		this._oldPosition = moveDest;

		debug.set("moveDest posOnLine", moveDest);

		if (this._blockingBall) {
			if (closestOpponentRobot) {
				moveDest = this._moveToNearBlock(closestOpponentRobot);
			} else {
				moveDest = this._futureBall! + (World.Geometry.FriendlyGoal - this._futureBall!).withLength(
					World.Ball.radius + this._robot.shootRadius);
			}
		}

		let ignoreOpponents = Ball.getRealisticBallPos().distanceTo(this._robot.pos) < World.Ball.radius + 2 * this._robot.radius + 0.1;
		let obstacleTable = {
			ignoreBall: this._blockingBall,
			task: this,
			pathRadius: this._robot.shootRadius,
			ignoreOpponentRobots: ignoreOpponents,
			disableOpponentPrediction: true,
			useCMAPathFinding: true
		};
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);

		debug.set("moveDest dribbler", moveDest);

		if (closestOpponentRobot && closestOpponentRobot.pos.y < 0) {
			let defendedRatio = UtilAttack.goalDefenseRatio(this._futureBall!, this._robot, "t/duel: sightCone");
			debug.set("defendedRatio", defendedRatio);

			defendedRatio += this._lastDefendGoal ? DEFEND_GOAL_HYSTERESIS : -DEFEND_GOAL_HYSTERESIS;
			if (defendedRatio < 0.70) {
				debug.set("duelMode", "agressive");
				moveDest = this._futureBall!;
				this._lastDefendGoal = false;

				// If we get too close to opponent change to contest to avoid collision
				let effectiveDistance = this._robot.pos.distanceTo(closestOpponentRobot!.pos) + (this._lastCloseToOpp ? -CLOSE_TO_OPP_HYSTERESIS : CLOSE_TO_OPP_HYSTERESIS);
				this._lastCloseToOpp = effectiveDistance < CLOSE_TO_OPP_DISTANCE;
				if (this._lastCloseToOpp) {
					this._contest();
					return;
				}
			} else {
				debug.set("duelMode", "defensive");
				this._lastDefendGoal = true;
			}
		}

		this._robot.trajectory.update(CurvedMaxAccel, moveDest, viewDir);
		vis.addCircle("t/duel: ClearRobot", this._robot.pos, 0.15, vis.colors.redHalf, true);

		// send the position of the ball
		if (this._isMainAttacker) {
			this._messaging.sendBroadcast(MessageType.attackPosition, this._futureBall!);
		}
	}
}
