import * as debug from "base/debug";
import * as Field from "base/field";
import * as Referee from "base/referee";
import { Robot } from "base/robot";
import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import * as Ball from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import * as RefereeObs from "glados/observer/referee";
import * as ObserverRobot from "glados/observer/robot";
import { BallEscort as BallEscortTask } from "glados/task/shared/ballescort";

export class BallEscort extends Behavior {
	_minRobot: Robot | undefined = undefined;

	private _checkOpponentTimings(): [Robot | undefined, number] {
		let [minOppRobot, minOppTime] = Ball.firstRobotAtBall(World.OpponentRobots);

		if (minOppTime === Infinity) {
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

	check(): boolean {
		let shotHysteresis = this._active ? 0.075 : 0.15;

		if (!(World.RefereeState === "Game" || World.RefereeState === "GameForce")
				||  !Referee.opponentTouchedLast()
				||  Ball.wasShot(shotHysteresis)) {
			return false;
		}

		let ballOutPos = Field.nextLineCut(World.Ball.pos, World.Ball.speed);

		debug.set("BallEscort/ballOutPos", ballOutPos);

		// ballOutPos should not be in defense area
		if (ballOutPos == undefined || Math.abs(ballOutPos.x) <= Field.defenseBaselineIntersectionDistance()) {
			return false;
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
			return false;
		}

		let icing = RefereeObs.opponentIcingPredicted(World.Ball);
		debug.set("BallEscort/icing", icing);

		let distToBorder = this._active ? 0.7 : 0.5;

		// If we can reach the ball we should try to if we are not already close to the field border
		if (!icing && ownTimeToBall < Infinity && Math.abs(this._robot.pos.x) < World.Geometry.FieldWidthHalf - distToBorder && Math.abs(this._robot.pos.y) < World.Geometry.FieldHeightHalf - distToBorder) {
			return false;
		}

		this._applyForMainAttacker();
		if (this._messaging.receiveTrainer(MessageType.mainAttacker) !== this._robot) {
			return false;
		}

		return true;
	}

	_updateTask(): TaskAssignment<typeof BallEscortTask> {
		return [BallEscortTask, this._minRobot ? [this._minRobot] : undefined];
	}
}
