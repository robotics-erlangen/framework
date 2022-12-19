import { throwInDebug } from "base/amun";
import * as debug from "base/debug";
import * as Field from "base/field";
import * as Geom from "base/geom";
import * as Referee from "base/referee";
import { Robot } from "base/robot";
import * as World from "base/world";

import { Agent } from "glados/agent/base/agent";
import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import * as Ball from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import * as ObserverRobot from "glados/observer/robot";
import { BallEscort as BallEscortTask } from "glados/task/shared/ballescort";

export class BallEscort extends Behavior {
	private _isDefender: boolean;
	_minRobot: Robot | undefined = undefined;

	private _checkOpponentTimings(): [Robot | undefined, number] {
		let [minOppRobot, minOppTime] = Ball.firstRobotAtBall(World.OpponentRobots);

		if (minOppTime === Infinity) {
			// TODO firstRobotAtBall does not call minTimeToBall anymore
			// firstRobotAtBall calls minTimeToBall which assumes the robot wants to look at it's opponent's goal
			// This can lead to situations where the function returns Infinity even though it wouldn't if we checked
			// with a different position (here: the ball position while receiving a pass)
			for (let robot of World.OpponentRobots) {
				if (Ball.receivesPass(robot)) {
					let time = Physics.robotTimeToBall(robot, World.Ball, World.Ball.pos, robot.maxSpeed);
					if (time < minOppTime) {
						minOppRobot = robot;
						minOppTime = time;
					}
				}
			}
		}

		return [minOppRobot, minOppTime];
	}

	private _isReachabilityOk(oppTime: number, ownTime: number): boolean {
		if (!(oppTime < Infinity)) {
			return true;
		}

		if (!this._active) {
			return false;
		}

		return oppTime - ownTime > 1;
	}

	constructor(agent: Agent, isDefender: boolean) {
		super(agent);
		this._isDefender = isDefender;
	}

	check(): Behavior | undefined {
		let shotHysteresis = this._active ? 0.075 : 0.15;

		if (Referee.isFriendlyFreeKickState()) {
			return undefined;
		}

		if (this._robot === ObserverRobot.doubleTouchingRobot()) {
			return undefined;
		}

		if (!(World.RefereeState === "Game" || World.RefereeState === "GameForce")
				|| !Referee.opponentTouchedLast()
				|| Ball.wasShot(shotHysteresis)) {
			return undefined;
		}

		let ballOutPos = Field.nextLineCut(World.Ball.pos, World.Ball.speed);

		debug.set("BallEscort/ballOutPos", ballOutPos);

		// ballOutPos should not be in defense area
		if (ballOutPos == undefined || Math.abs(ballOutPos.x) <= Field.defenseBaselineIntersectionDistance()) {
			return undefined;
		}

		let [minOppRobot, minOppTime] = this._checkOpponentTimings();
		let ownTimeToBall = ObserverRobot.minTimeToBall(this._robot);

		debug.set("BallEscort/ownTimeToBall", ownTimeToBall);
		debug.set("BallEscort/minRobot", minOppRobot);
		debug.set("BallEscort/minOppTime", minOppTime);

		if (minOppRobot) {
			this._minRobot = minOppRobot;
		}

		if (!this._isReachabilityOk(minOppTime, ownTimeToBall)) {
			return undefined;
		}

		// we do not want to execute ballescort when the ball interception position is close to the opponent defense area
		// these situations are conducive to scoring goals
		let futureBallPos = Physics.ballAtTime(World.Ball, ownTimeToBall).pos;
		let defenseDist = this._active ? 1 : 1.2;
		if (Field.distanceToOpponentDefenseArea(futureBallPos, 0) < defenseDist) {
			return undefined;
		}

		// also do not run ballescort if the ball is imminent and we are close to the opponent defense area
		if (this._robot.pos.distanceToSq(World.Ball.pos) < 1 && Field.distanceToOpponentDefenseArea(this._robot.pos, 0) < defenseDist) {
			if (Ball.isSlowBall()) {
				return undefined;
			}
			if ((this._robot.pos - World.Ball.pos).dot(World.Ball.speed) > 0) {
				return undefined;
			}
		}


		let distToBorder = this._active ? 0.7 : 0.5;
		// If we can reach the ball we should try to if we are not already close to the field border
		if (ownTimeToBall < Infinity && Math.abs(this._robot.pos.x) < World.Geometry.FieldWidthHalf - distToBorder && Math.abs(this._robot.pos.y) < World.Geometry.FieldHeightHalf - distToBorder) {
			return undefined;
		}


		// Always take a ball if we are aligned perfectly
		let intersection = Geom.intersectLineCircle(World.Ball.pos, World.Ball.speed, this._robot.pos, this._robot.radius * 1.5);
		// Check if ball is between outline and robot
		let behindRobot: boolean = ballOutPos.distanceToSq(World.Ball.pos) < ballOutPos.distanceToSq(this._robot.dribblerPos);
		if (intersection.length !== 0 && !behindRobot) {
			// The ball is moving directly towards the robot
			return undefined;
		}

		this._applyForMainAttacker();
		if (this._messaging.receiveTrainer(MessageType.mainAttacker) !== this._robot) {
			return undefined;
		}

		return this;
	}

	_updateTask(): TaskAssignment<typeof BallEscortTask> {
		/*
		 * Only send an objective when run on a defender.
		 * If the main attacker is an attacker, he sends an objective in
		 * SelectObjective.
		 */
		if (this._isDefender) {
			const [, receivedObjective] = this._messaging.receiveSingleSender(MessageType.selectedObjective, true);
			if (receivedObjective) {
				this._messaging.sendBroadcast(MessageType.selectedObjective, receivedObjective);
			} else {
				throwInDebug("a/s/ballescort: No objective to propagate");
			}
		}

		return [BallEscortTask, [this._minRobot]];
	}
}
