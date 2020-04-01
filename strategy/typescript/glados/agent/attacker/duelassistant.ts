import { FriendlyRobot } from "base/robot";
import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import { DuelAssistant as TaskDuelAssistant } from "glados/task/attacker/duelassistant";
import * as Rating from "glados/util/rating";


export class DuelAssistant extends Behavior {
	_opponentHasBall: boolean = false;
	_closerThanOpp: boolean = false;
	_lastChippedHysteresis: boolean = false;
	_lastTrue: number | undefined = undefined;

	_stop() {
		this._opponentHasBall = false;
		this._closerThanOpp = false;
		this._lastChippedHysteresis = false;
		this._lastTrue = undefined;
	}

	private rateRobot(sender: FriendlyRobot): number {
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

	check(): Behavior | undefined {
		if (this._robot === this._messaging.receiveTrainer(MessageType.mainAttacker)) {
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
			let rating = this.rateRobot(duellingRobot);
			let ratingArg: Rating.LeveledRating = new Rating.LeveledRating(MessageType.duelAssistant);
			ratingArg.setRating(0,rating);
			this._messaging.sendToTrainerRepeated(MessageType.exclusiveRole, [ MessageType.duelAssistant, ratingArg ]);
		}

		let isDuelAssistant = (this._messaging.receiveTrainer(MessageType.duelAssistant) === this._robot);

		if (isDuelAssistant) {
			this._lastTrue = World.Time;
		} else if (!(this._lastTrue != undefined && (World.Time - this._lastTrue) <= 1)) {
			this._lastTrue = undefined;
		}

		return this._lastTrue != undefined
			? this
			: undefined;
	}


	_updateTask(): TaskAssignment<typeof TaskDuelAssistant> {
		return [TaskDuelAssistant];
	}
}
