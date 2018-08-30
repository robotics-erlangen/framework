import * as Field from "base/field";
import {FriendlyRobot} from "base/robot";
import {Position} from "base/vector";
import * as Referee from "base/referee";
import * as World from "base/world";

import {MessageType} from "glados/control/messaging";
import * as Ball from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import {Behavior, TaskAssignment} from "glados/agent/base/behavior";
import {AggressiveKeeper} from "glados/task/keeper/aggressivekeeper";
import {Keeper} from "glados/task/keeper/keeper";
import {ChipAway as KeeperChipAway} from "glados/task/keeper/chipaway";
import {Pass} from "glados/task/shared/pass";
import * as Attack from "glados/util/attack";

export class HandleBall extends Behavior {
	private _pass: {target?: FriendlyRobot, ballPos: Position} | undefined;
	private _hysteresis: boolean = false;

	behindCenterbacks (object: {pos: Position, radius: number}): boolean {
		let hyst = this._hysteresis ? 0.1 : 0;
		let defenseDistance = this._robot.radius + this._robot.shootRadius + hyst;
		return Field.distanceToFriendlyDefenseArea(object.pos, object.radius) < defenseDistance;
	}

	check (): boolean {
		if (Referee.isStopState() || Referee.isOpponentPenaltyState() || World.GameStage === "PenaltyShootout") {
			return false
		}
		// if a slow ball enters the defense area
		let active = this.behindCenterbacks(World.Ball) && Ball.isSlowBall()
		if (active) {
			// force being mainAttacker
			this._hysteresis = true;
			this._applyForMainAttacker(undefined, undefined, 2);
		} else {
			this._hysteresis = false;
		}

		let mainAttackerFlag = this._messaging.receiveTrainer(MessageType.mainAttacker) === this._robot
		return mainAttackerFlag;
	}

	_updateTask (): TaskAssignment<typeof Keeper> | TaskAssignment<typeof Pass> | TaskAssignment<typeof KeeperChipAway>
			| TaskAssignment<typeof AggressiveKeeper> {
		let endPos = Physics.ballAtTime(World.Ball, Infinity).pos
		let startInside = Field.isInFriendlyDefenseArea(World.Ball.pos, -World.Ball.radius-this._robot.radius)
		let endInside = Field.isInFriendlyDefenseArea(endPos, -World.Ball.radius-this._robot.radius)

		// check if there is a danger of a own goal
		let ballDist = Field.distanceToFriendlyGoalLine(World.Ball.pos, 0)
		let robotDist = Field.distanceToFriendlyGoalLine(this._robot.pos, 0)
		let ballBehindKeeper = ballDist < robotDist

		let suggestions = this._messaging.receive(MessageType.passSuggestion);
		if (startInside && endPos.y < World.Geometry.FriendlyGoal.y + 0.01) {
			// if ball is inside defense area and will enter the goal -> block the ball
			return [Keeper];
		} else if (startInside && endInside && !ballBehindKeeper && suggestions) {
			// if ball is inside defense area and will not leave it -> we have time to act
			// try to find a good pass
			this._pass = Attack.choosePassFromSuggestions(this._robot, suggestions, this._pass && this._pass.ballPos, false)[0];
			if (this._pass != undefined) { //check if there is a good pass, else chip away
				return [Pass, [ this._pass.target, this._pass.ballPos, true ]];
			} else {
				return [KeeperChipAway];
			}
		} else {
			// if inside and ball will leave or outside -> get rid of the ball
			return [AggressiveKeeper];
		}
	}
}