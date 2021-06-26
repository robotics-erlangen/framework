import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as Referee from "base/referee";
import { Vector } from "base/vector";
import * as World from "base/world";

import { Attacker } from "glados/agent/attacker";
import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import * as Ball from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
import { Duel as TaskDuel } from "glados/task/shared/duel";


const SAFTY_SPACE = 0.05;
const DIST_HYSTERESIS = 0.02; // must be always smaller than SAFTY_SPACE
const MAX_BALL_SPEED = 1;
export class Duel extends Behavior {
	private _opponentHasBall: boolean = false;
	private _closerThanOpp: boolean = false;
	private _lastChippedHysteresis: boolean = false;

	_stop() {
		this._opponentHasBall = false;
		this._closerThanOpp = false;
		this._lastChippedHysteresis = false;
		this._active = false;
	}

	private genericCheck(): boolean {
		if (Referee.isFriendlyFreeKickState()) {
			debug.set("duel check", "freekick");
			return false;
		}

		if (Robot.doubleTouchingRobot() === this._robot) {
			debug.set("duel check", "double touch");
			return false;
		}

		// only duel while its rational to touch the ball
		if (!Field.isInAllowedField(World.Ball.pos, 0)) {
			debug.set("duel check", "allowed field");
			return false;
		}

		if (World.Ball.detectionQuality < 0.2 && this._active) {
			debug.set("duel check", "invisible ball");
			return true;
		}

		// if we receive the ball first, try shootgoal or something
		let receivesPass = Ball.receivesPass(this._robot);
		if (receivesPass) {
			let firstAtBall = true;
			let selfDistToBall = this._robot.pos.distanceTo(World.Ball.pos);
			for (let opp of World.OpponentRobots) {
				if (Ball.receivesPass(opp)) {
					let oppDistToBall = opp.pos.distanceTo(World.Ball.pos);

					// duel situation in which the ball is between the robots
					const minDist = this._robot.radius + World.Ball.radius + 0.01;
					if (selfDistToBall < minDist && oppDistToBall < minDist) {
						firstAtBall = false;
						break;
					}
					if (oppDistToBall < selfDistToBall) {
						let pointOnBallLine = opp.pos.orthogonalProjection(World.Ball.pos, World.Ball.pos + World.Ball.speed)[0];
						if (opp.pos.distanceTo(pointOnBallLine) < 0.5) {
							let robotTime = Physics.robotTimeToPos(opp, pointOnBallLine, new Vector(0, 0))[0];
							let ballOffset = World.Ball.speed.withLength(World.Ball.radius + opp.shootRadius);
							let ballTime = Physics.checkedBallRollTime(World.Ball, pointOnBallLine - ballOffset);
							if (ballTime > robotTime + 0.1) {
								firstAtBall = false;
								break;
							}
						}
					}
				}
			}
			if (firstAtBall) {
				debug.set("duel check", "firstAtBall");
				return false;
			}
		}


		if ((this._agent as Attacker).beOffensive) {
			debug.set("duel check", "beOffensive");
			return false;
		}

		// duel is not beneficial in opponent corners
		let cornerMinX = World.Geometry.FieldWidthHalf * (this._active ? 0.7 : 0.6);
		let cornerMinY = World.Geometry.FieldHeightHalf * (this._active ? 0.6 : 0.5);
		if (World.Ball.pos.y > cornerMinY && Math.abs(World.Ball.pos.x) > cornerMinX) {
			debug.set("duel check", "opponent corner");
			return false;
		}

		// if an opponent controls the ball
		for (let opp of World.OpponentRobots) {
			if (Robot.controlsBall(opp, 0.3)) {
				debug.set("duel check", "opponent controls ball");
				return true;
			}
		}

		// if the ball is shot fast at the opponent goal, dont duel it since it might be chipped by us
		let ballSpeed = World.Ball.speed.length();
		if (ballSpeed > MAX_BALL_SPEED + (this._lastChippedHysteresis ? 0 : 0.5)) {
			let intersectLine = geom.intersectLineLine(World.Ball.pos, World.Ball.speed, World.Geometry.OpponentGoal, new Vector(1, 0));
			let intersection = intersectLine[0];
			let lambdaOfBallToIntersection = intersectLine[1];
			if ((intersection != undefined) && (Math.abs(intersection.x) < World.Geometry.GoalWidth / 2 + (this._lastChippedHysteresis ? 1 : 0)) && (lambdaOfBallToIntersection != undefined) && lambdaOfBallToIntersection >= 0) {
				this._lastChippedHysteresis = true;
				debug.set("duel check", "ball speed");
				return false;
			} else {
				this._lastChippedHysteresis = false;
			}
		} else {
			this._lastChippedHysteresis = false;
		}

		// prefer passing instead of duelling when being in the opponent half of the field
		let ballYHysteresis = this._active ? 1.0 : 0.0;
		let ballDefAreaHysteresis = this._active ? 0.8 : 0.4;
		if (World.Ball.pos.y > ballYHysteresis && Field.distanceToOpponentDefenseArea(World.Ball.pos, 0) > ballDefAreaHysteresis) {
			debug.set("duel check", "attack area");
			return false;
		}

		// if the opponent controls the ball, duel him
		let ballOwner = Ball.opponentBallOwner() || Ball.opponentBallDribbler();
		if (ballOwner) {
			let dist = this._closerThanOpp ? -SAFTY_SPACE : (-SAFTY_SPACE - DIST_HYSTERESIS);
			// we are closer to the ball, so dont duel
			if ((this._robot.dribblerPos.distanceTo(World.Ball.pos) - ballOwner.dribblerPos.distanceTo(World.Ball.pos)) < dist) {
				this._closerThanOpp = true;
			} else {
				this._closerThanOpp = false;
				debug.set("duel check closerThanOpp", this._closerThanOpp);
				debug.set("duel check", "closerThanOpp");
				return true;
			}
			debug.set("duel check closerThanOpp", this._closerThanOpp);
		} else {
			this._closerThanOpp = false;
		}

		// if any opponent receives the ball (and we don't), duel him
		// this may cause duel to get active A LOT
		for (let r of World.OpponentRobots) {
			if (Ball.receivesPass(r) && r.pos.distanceTo(this._robot.pos) < 1) {
				debug.set("duel check", "oppGetsBall");
				return true;
			}
		}

		let timeToBallHysteresis = this._active ? 0 : 0.3;
		if (!Ball.receivesPass(this._robot)) {
			let oppTime = Ball.firstRobotAtBall(World.OpponentRobots)[1];
			if (oppTime + timeToBallHysteresis < Robot.minTimeToBall(this._robot)) {
				debug.set("duel check", "hysteresis");
				return true;
			}
		}
		debug.set("duel check", "default");

		return false;
	}


	check(): Behavior | undefined {
		let isMainAttacker = (this._messaging.receiveTrainer(MessageType.mainAttacker) === this._robot);
		this._forceKeepingInPool = isMainAttacker;

		if (!isMainAttacker) {
			debug.set("duel check", "not mainAttacker");
			this._active = false;
		} else {
			this._active = this.genericCheck();
		}
		return this._active
			? this
			: undefined;
	}


	_updateTask(): TaskAssignment<typeof TaskDuel> {
		return [TaskDuel];
	}
}
