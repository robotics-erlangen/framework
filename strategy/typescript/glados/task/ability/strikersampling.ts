import * as geom from "base/geom";
import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";
import { MessageBox, MessageType } from "glados/control/messaging";
import * as Ball from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
import * as ObserverShoot from "glados/observer/shoot";
import * as Rating from "glados/util/rating";

let G = World.Geometry;


function visualizeRating(name: string, pos: Position, rating: number) {
	vis.addCircle("t/a/strikersampling: " + name, pos, 0.06,
		vis.fromTemperature(1 - rating), true);
}

export class StrikerSampling {
	_attackPosition: Position = new Vector(0, 0);
	_attackTime: number = 0;
	_mainAttacker: FriendlyRobot | undefined;

	_robot: FriendlyRobot;
	_messaging: MessageBox;

	constructor(robot: FriendlyRobot, messaging: MessageBox) {
		this._robot = robot;
		this._messaging = messaging;
	}

	precalculate() {
		this._mainAttacker = this._messaging.receiveTrainer(MessageType.mainAttacker);
		let pos = this._messaging.receiveSingleSender(MessageType.attackPosition)[1];
		let time = this._messaging.receiveSingleSender(MessageType.attackTime)[1];
		this._attackPosition = pos || World.Ball.pos;
		this._attackTime = time || (this._mainAttacker ? World.Time + Robot.minTimeToBall(this._mainAttacker) : World.Time);

		vis.addCircle("t/a/strikersampling: attackPosition", this._attackPosition, 0.13,
			vis.colors.orchidHalf, false, undefined, undefined, 0.02);
	}


	canReachInTime(ballPos: Position): number {
		if (!this._mainAttacker) {
			return 1;
		}

		let robotPos = ballPos + (ballPos - this._attackPosition).setLength(this._robot.shootRadius + World.Ball.radius);
		let robotTime = Physics.robotTimeToPos(this._robot, robotPos,
			(robotPos - this._robot.pos).setLength(this._robot.maxSpeed))[0];
		let shootTime = this._attackTime - World.Time;
		let ballTime = ObserverShoot.ballPassTime(this._attackPosition, ballPos, this._robot, undefined, this._mainAttacker);

		let rating = Rating.valueToRating(shootTime + ballTime - robotTime, 0.2, 0.5);

		if (!amun.isPerformanceMode) {
			visualizeRating("canReachInTime", ballPos, rating);
		}

		return rating;
	}

	passTooShort(ballPos: Position): number {
		let rating = Rating.valueToRating(ballPos.distanceTo(this._attackPosition), 3, 5);

		if (!amun.isPerformanceMode) {
			visualizeRating("passTooShort", ballPos, rating);
		}

		return rating;
	}

	volleyPass(ballPos: Position): number {
		if (!this._mainAttacker || !Ball.receivesPass(this._mainAttacker)) {
			return 1;
		}

		let minRating = 0.5;
		let volleyAngle = World.Ball.speed.absoluteAngleDiff(this._attackPosition - ballPos);
		let volleySuccessProbability = Rating.valueToRating(volleyAngle, 65 / 180 * Math.PI, 50 / 180 * Math.PI);
		let rating = volleySuccessProbability * (1 - minRating) + minRating;

		if (!amun.isPerformanceMode) {
			visualizeRating("volleyPass", ballPos, rating);
		}

		return rating;
	}

	goalAngle(ballPos: Position): number {
		let minRating = 0.0;
		let angle = (World.Geometry.OpponentGoalRight - ballPos).absoluteAngleDiff(World.Geometry.OpponentGoalLeft - ballPos);
		let rating = Rating.valueToRating(angle, 0, 20 / 180 * Math.PI) * (1 - minRating) + minRating;

		if (!amun.isPerformanceMode) {
			visualizeRating("goalAngle", ballPos, rating);
		}
		return rating;
	}

	// function StrikerSampling:advance(ballPos)
	// 	local distToGoal = ballPos.distanceTo(World.Geometry.OpponentGoal)
	// 	local currentDistToGoal = this._attackPosition.distanceTo(World.Geometry.OpponentGoal)
	// 	local bestAdvance = World.Geometry.FieldHeightHalf * 0.3
	// 	local
	// 	local distAdvance = currentDistToGoal - distToGoal - bestAdvance
	// 	local rating = 1 / (distAdvance * distAdvance / World.Geometry.FieldHeight + 1)
	// 	visualizeRating("advance", ballPos, rating)
	// 	return rating
	// end

	crossPass(ballPos: Position): number {
		let angleAttackGoalBall = (ballPos - World.Geometry.OpponentGoal).absoluteAngleDiff(
			this._attackPosition - World.Geometry.OpponentGoal);
		let rating = Rating.valueToRating(angleAttackGoalBall, 0, Math.PI * 0.5);

		if (!amun.isPerformanceMode) {
			visualizeRating("crossPass", ballPos, rating);
		}

		return rating * 0.5 + 0.5;
	}

	distToGoal(ballPos: Position): number {
		let minRating = World.Ball.speed.length() < 1 ? 0.3 : 0.1;

		let distToGoal = ballPos.distanceTo(World.Geometry.OpponentGoal);
		let minDist = World.Geometry.DefenseRadius + 0.7;
		let ratingBase = Rating.valueToRating(distToGoal, World.Geometry.FieldHeight * 0.7, minDist);
		let ratingBonus = Rating.valueToRating(distToGoal, minDist + 2, minDist);
		let rating = 0.2 * ratingBase + 0.8 * ratingBonus;

		// rating demerit for steep passes, as these often miss due to volley inaccuracy
		if (G.DefenseWidth && Math.abs(ballPos.x) > G.DefenseWidth / 2
				&&  World.Ball.pos.y > 1.5 * G.DefenseHeight) {
			let demeritWeight = 0.3;
			let distanceRatingDemerit = Rating.valueToRating(distToGoal, G.DefenseWidth / 2, minDist * 1.2);
			rating = (1 - demeritWeight) * rating + demeritWeight * distanceRatingDemerit;
		}

		if (!amun.isPerformanceMode) {
			visualizeRating("distToGoal", ballPos, rating);
		}

		return rating * (1 - minRating) + minRating;
	}

	volleyCircle(ballPos: Position): number {
		// the smaller the radius is, the more positions are viable for volley

		let minRating = 0.6;
		let radius = geom.inscribedAngle(ballPos, World.Geometry.OpponentGoal, 60 / 180 * Math.PI)[2];
		let rating = Rating.valueToRating(radius, 2, 0.5);

		return rating * (1 - minRating) + minRating;
	}


	evalLocation(ballPos: Position, bestScore: number): number {
		let score = 1;

		score *= this.distToGoal(ballPos);
		if (score < bestScore) {
			return score;
		}

		score *= this.crossPass(ballPos);
		if (score < bestScore) {
			return score;
		}

		score *= this.goalAngle(ballPos);
		if (score < bestScore) {
			return score;
		}

		score *= this.volleyCircle(ballPos);
		if (score < bestScore) {
			return score;
		}

		score *= this.passTooShort(ballPos);
		if (score < bestScore) {
			return score;
		}

		score *= this.volleyPass(ballPos);
		if (score < bestScore) {
			return score;
		}

		score *= this.canReachInTime(ballPos);

		visualizeRating("total", ballPos, score);

		return score;
	}
}
