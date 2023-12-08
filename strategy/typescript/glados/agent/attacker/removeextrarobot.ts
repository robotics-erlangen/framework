import * as BaseRef from "base/referee";
import { FriendlyRobot } from "base/robot";
import { Vector } from "base/vector";
import * as World from "base/world";

import { Behavior, TaskAssignment } from "glados/agent/base/behavior";
import { MessageBox, MessageType } from "glados/control/messaging";
import { MoveToPos } from "glados/task/shared/movetopos";
import * as Rating from "glados/util/rating";

const USE_EXCHANGE_POS_UP = true;
const EXCHANGE_POSITION_DOWN = new Vector(World.Geometry.FieldWidthHalf, 0); // false
const EXCHANGE_POS_UP = new Vector(-World.Geometry.FieldWidthHalf, 0); // true

function rateRobot(robot: FriendlyRobot, messaging: MessageBox): number {
	// chosen one should be choosen the whole time
	if (messaging.receiveTrainer(MessageType.exchangeRobot) === robot) {
		return 3;
	}
	if (!robot.canDribble || !robot.canShoot) {
		return 2;
	}
	// otherwise: distance to goal
	let distance = robot.pos.distanceToSq(World.Geometry.OpponentGoal);
	return Rating.valueToRating(distance, 0, World.Geometry.FieldHeight ** 2);

}

/**
 * When we have too many robots on the field, up to one robot chooses this
 * behavior in order to be taken from the field
 */
export class RemoveExtraRobot extends Behavior {
	public check(): Behavior | undefined {
		if (!BaseRef.hasTooManyFriendlyRobots()) {
			return undefined;
		}
		if (this._messaging.receiveTrainer(MessageType.mainAttacker) === this._robot) {
			return undefined;
		}
		// apply for exchange robot
		let rating = rateRobot(this._robot, this._messaging);
		let ratingArg: Rating.LeveledRating = new Rating.LeveledRating(MessageType.exchangeRobot);
		ratingArg.setRating(0, rating);
		this._messaging.sendToTrainerRepeated(MessageType.exclusiveRole, [MessageType.exchangeRobot, ratingArg]);

		return this._messaging.receiveTrainer(MessageType.exchangeRobot) === this._robot
			? this
			: undefined;
	}

	protected _updateTask(): TaskAssignment<typeof MoveToPos> {

		let exchangePos = USE_EXCHANGE_POS_UP ? EXCHANGE_POS_UP : EXCHANGE_POSITION_DOWN;
		if (this._robot.pos.distanceToSq(exchangePos) < 1) {

			/*
			 * prevent robot to be choosen as defender
			 * or main Attacker after being ready for exchange
			 * to be sure the robot remains at the exchange pos
			 * and does not change while the robot handler takes it
			 */
			this.applyForMainAttacker(undefined, undefined, -Infinity);
		}
		amun.setRobotExchangeSymbol(this._robot.generation, this._robot.id, true);
		return [MoveToPos, [{ pos: exchangePos }]];
	}
}
