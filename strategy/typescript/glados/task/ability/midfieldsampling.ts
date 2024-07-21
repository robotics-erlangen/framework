import * as geom from "base/geom";
import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { MessageType } from "glados/control/messaging";
import * as Ball from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
import * as ObserverShoot from "glados/observer/shoot";
import { Task } from "glados/task/base";
import * as Rating from "glados/util/rating";


function visualizeRating(name: string, pos: Position, rating: number) {
	if (name !== "total") {
		return;
	}

	vis.addCircle(`t/a/MidfieldSampling: ${name}`, pos, 0.06,
		vis.fromTemperature(1 - rating), true);
}

interface Suggestion {
	ballPos: Position;
	time: number;
	anonymous: boolean;
	chip: boolean;
	manual: boolean;
}

export class MidfieldSampling {
	// note that these values will never be read as long as the functions are used in the correct order
	// they are present to please our compiler overlord
	private _attackPosition: Position = new Vector(0, 0);
	private _attackTime: number = World.Time;
	private _mainAttacker: FriendlyRobot | undefined = undefined;
	private _strikers: FriendlyRobot[] = [];
	private _strikerSuggestions: Map<FriendlyRobot, Suggestion> = new Map<FriendlyRobot, Suggestion>();

	private _robot: FriendlyRobot;
	private _task: Task;

	private get _messaging() {
		return this._task.behavior().agent().messaging();
	}

	public constructor(task: Task) {
		this._robot = task.behavior().agent().robot();
		this._task = task;
	}

	private _findStrikerPassSuggestions() {
		let passSuggestions = this._messaging.receive(MessageType.passSuggestion);
		let strikerSuggestions: Map<FriendlyRobot, Suggestion> = new Map<FriendlyRobot, Suggestion>();
		let strikers = this._messaging.receive(MessageType.strikerFlag);
		for (let [sender, msg] of passSuggestions.entries()) {
			for (let striker of strikers.keys()) {
				this._strikers.push(striker);
				if (sender.id === striker.id) {
					strikerSuggestions.set(sender, msg);
					break;
				}
			}
		}

		this._strikerSuggestions = strikerSuggestions;
	}

	public precalculate() {
		this._mainAttacker = this._messaging.receiveTrainer(MessageType.mainAttacker);
		let pos = this._messaging.receiveSingleSender(MessageType.attackPosition)[1];
		let time = this._messaging.receiveSingleSender(MessageType.earliestAttackTime)[1];
		this._attackPosition = pos || World.Ball.pos;
		this._attackTime = time != undefined ? time : (this._mainAttacker ? World.Time + Robot.minTimeToBall(this._mainAttacker) : World.Time);

		this._findStrikerPassSuggestions();
	}

	private closeOpponents(ballPos: Position) {
		let minRating = 0.3;
		let closestDistance = Infinity;

		// TODO count all close robots, not just the closest
		for (let bot of World.OpponentRobots) {
			let distToPos = bot.pos.distanceToSq(ballPos);
			if (distToPos < closestDistance) {
				closestDistance = distToPos;
			}
		}

		closestDistance = Math.sqrt(closestDistance);
		let rating = (1 - minRating) * Rating.valueToRating(closestDistance, 0.6, 2) + minRating;
		if (!amun.isPerformanceMode) {
			visualizeRating("closeOpponents", ballPos, rating);
		}


		return rating;
	}

	private movingAhead(ballPos: Position) {
		let minRating = 0.3;
		let currentY = this._attackPosition.y;
		let plannedY = ballPos.y;
		let rating = (1 - minRating) * Rating.valueToRating(plannedY, currentY - 0.2, currentY + 2) + minRating;

		if (!amun.isPerformanceMode) {
			visualizeRating("movingAhead", ballPos, rating);
		}

		return rating;
	}

	private passDistance(ballPos: Position) {
		let minRating = 0.7;
		let dist = this._attackPosition.distanceTo(ballPos);
		let rating = (1 - minRating) * Rating.valueToRating(dist, 9, 4) + minRating;

		if (!amun.isPerformanceMode) {
			visualizeRating("passDistance", ballPos, rating);
		}

		return rating;
	}

	private volleyToStriker(ballPos: Position) {
		let minRating = 0.7;

		let passSuggestions = this._strikerSuggestions;
		let passReceiveVec = (this._attackPosition - ballPos);

		let rating = minRating;

		let remainingRating = 1 - minRating;
		let ratingWeight = remainingRating / passSuggestions.size;
		for (let msg of passSuggestions.values()) {
			let passPos = msg.ballPos;
			let volleyAngle = passReceiveVec.absoluteAngleDiff(passPos - ballPos);
			// Note: 90 degrees is not a good volley, but pass opportunities to strikers should still be rewarded
			let volleySuccessProbability = Rating.valueToRating(volleyAngle, geom.degreeToRadian(90), geom.degreeToRadian(50));
			rating = rating + ratingWeight * volleySuccessProbability;
		}

		if (!amun.isPerformanceMode) {
			visualizeRating("volleyToStriker", ballPos, rating);
		}

		return rating;
	}

	private volleyPass(ballPos: Position) {
		if (!this._mainAttacker || !Ball.receivesPass(this._mainAttacker)) {
			return 1;
		}

		let minRating = 0.6;
		let volleyAngle = World.Ball.speed.absoluteAngleDiff(this._attackPosition - ballPos);
		let volleySuccessProbability = Rating.valueToRating(volleyAngle, geom.degreeToRadian(65), geom.degreeToRadian(50));
		let rating = volleySuccessProbability * (1 - minRating) + minRating;

		if (!amun.isPerformanceMode) {
			visualizeRating("volleyPass", ballPos, rating);
		}

		return rating;
	}

	private canReachInTime(ballPos: Position) {
		if (!this._mainAttacker) {
			return 1;
		}

		let robotPos = ballPos + (ballPos - this._attackPosition).withLength(this._robot.shootRadius + World.Ball.radius);
		let robotTime = Physics.robotTimeToPos(this._robot, robotPos, new Vector(0, 0))[0];
		let shootTime = this._attackTime - World.Time;
		let ballTime = ObserverShoot.ballPassTime(this._attackPosition, ballPos, this._robot, undefined, this._mainAttacker);

		let rating = Rating.valueToRating(shootTime + ballTime - robotTime, 0.2, 0.5);

		if (!amun.isPerformanceMode) {
			visualizeRating("canReachInTime", ballPos, rating);
		}

		return rating;
	}

	public evalLocation(ballPos: Position, bestScore: number) {
		let score = 1;

		score *= this.movingAhead(ballPos);
		if (score < bestScore) {
			return score;
		}

		score *= this.passDistance(ballPos);
		if (score < bestScore) {
			return score;
		}

		score *= this.closeOpponents(ballPos);
		if (score < bestScore) {
			return score;
		}

		score *= this.volleyPass(ballPos);
		if (score < bestScore) {
			return score;
		}

		score *= this.volleyToStriker(ballPos);
		if (score < bestScore) {
			return score;
		}

		score *= this.canReachInTime(ballPos);
		if (score < bestScore) {
			return score;
		}

		visualizeRating("total", ballPos, score);

		return score;
	}
}
