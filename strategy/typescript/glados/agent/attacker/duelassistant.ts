/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V., Tobias Heineken                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

import { FriendlyRobot } from "base/robot";
import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import * as Robot from "glados/observer/robot";
import { DuelAssistant as TaskDuelAssistant } from "glados/task/attacker/duelassistant";
import * as Rating from "glados/util/rating";


export class DuelAssistant extends Behavior {
	private _opponentHasBall: boolean = false;
	private _closerThanOpp: boolean = false;
	private _lastChippedHysteresis: boolean = false;
	private _lastTrue: number | undefined = undefined;

	protected _stop() {
		this._opponentHasBall = false;
		this._closerThanOpp = false;
		this._lastChippedHysteresis = false;
		this._lastTrue = undefined;
	}

	private _rateRobot(sender: FriendlyRobot): number {
		let distanceToDuelRobot = this._robot.pos.distanceTo(sender.pos);
		let distanceToOwnGoal = World.Geometry.FriendlyGoal.distanceTo(this._robot.pos);
		let distanceBallToOwnGoal = World.Geometry.FriendlyGoal.distanceTo(World.Ball.pos);
		let distanceRobotToBall = World.Ball.pos.distanceTo(this._robot.pos);

		let rateDistanceToDuelRobot = Rating.valueToRating(distanceToDuelRobot, 4, 0);
		let rateDistanceToOwnGoal = Rating.valueToRating(distanceToOwnGoal, 8, 1);
		let rateDistanceBallToOwnGoal = Rating.valueToRating(distanceBallToOwnGoal, 8, 1);
		let rateDistanceRobotToBall = Rating.valueToRating(distanceRobotToBall, 4, 0);

		return (rateDistanceToDuelRobot + rateDistanceToOwnGoal
			+ rateDistanceBallToOwnGoal + rateDistanceRobotToBall) / 4;

	}

	public check(): Behavior | undefined {
		if (this._robot === this._messaging.receiveTrainer(MessageType.mainAttacker)
				|| this._robot === Robot.doubleTouchingRobot()) {
			this._lastTrue = undefined;
			return undefined;
		}

		let sender: FriendlyRobot | undefined;
		// let messages = this._messaging.receive(MessageType.defendedOpponent);
		let messages = this._messaging.receive(MessageType.dueledOpponent, true);
		if (messages.size > 0) {
			sender = messages.keys().next().value;
		}
		if (sender == undefined && this._lastTrue == undefined) {
			return undefined;
		}
		if (sender != undefined) {
			let duellingRobot = sender;
			if (duellingRobot.pos.distanceTo(World.Ball.pos) > 1) {
				this._lastTrue = undefined;
				return undefined;
			}
			let rating = this._rateRobot(duellingRobot);
			let ratingArg: Rating.LeveledRating = new Rating.LeveledRating(MessageType.duelAssistant);
			ratingArg.setRating(0, rating);
			this._messaging.sendToTrainerRepeated(MessageType.exclusiveRole, [MessageType.duelAssistant, ratingArg]);
		}

		const selectedByTrainer = this._messaging.receiveTrainer(MessageType.duelAssistant);

		if (selectedByTrainer === this._robot) {
			this._lastTrue = World.Time;
		} else if (selectedByTrainer !== undefined
				|| this._lastTrue === undefined
				|| (World.Time - this._lastTrue) > 1) {
			this._lastTrue = undefined;
		}

		return this._lastTrue != undefined
			? this
			: undefined;
	}


	protected _updateTask(): TaskAssignment<typeof TaskDuelAssistant> {
		return [TaskDuelAssistant];
	}
}
