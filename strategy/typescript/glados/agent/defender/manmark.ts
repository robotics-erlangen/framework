import * as debug from "base/debug";
import {Robot} from "base/robot";
import {Position, Vector} from "base/vector";
import * as Field from "base/field";
import * as Referee from "base/referee";
import * as World from "base/world";
import * as vis from "base/vis";
import {Behavior} from "glados/agent/base/behavior";
import {MessageType} from "glados/control/messaging";
import * as Goal from "glados/observer/goal";
import {CenterBack} from "glados/task/defender/centerback"
import {Duel} from "glados/task/shared/duel";
import {ManMark as ManMarkTask} from "glados/task/defender/manmark";
import {Task} from "glados/task/base";
import * as Defense from "glados/util/defense";


export class ManMark extends Behavior {
	_opp: Robot | undefined = undefined;
	_restartTask: boolean = true;
	_wasCenterback: boolean = false;
	_manmarkInfo: {pos: Position, id: number} = {pos: new Vector(0, 0), id: 0};

	_stop () {
		this._opp = undefined;
		this._restartTask = true;
		this._wasCenterback = false;
		this._manmarkInfo = {pos: new Vector(0, 0), id: 0};
	}

	check (): boolean {
		let role = this._messaging.receiveTrainer(MessageType.roleAssignment);
		return role != undefined && role.name === "ManMark";
	}

	_updateTask (): [typeof Task] {
		let roleAssignment = this._messaging.receiveTrainer(MessageType.roleAssignment);
		if (roleAssignment == undefined || roleAssignment.name !== "ManMark") {
			throw new Error();
		}
		let newOpp = roleAssignment.params[0];
		this._restartTask = newOpp != this._opp;
		this._opp = newOpp;
		let wasCenterback = this._wasCenterback;
		this._wasCenterback = false;

		debug.set("target", this._opp.id);
		let dest = Defense.manMarkPos(this._opp);

		// try to intercept a possible goal shot if we are no centerback
		let isCB = this._messaging.receiveTrainer(MessageType.centerBackPosTarget);
		if (isCB == undefined) {
			let passReceivers = Goal.predictShot()[3];
			let passReceiver = passReceivers != undefined && passReceivers.length > 0 ? passReceivers[0].robot : undefined;
			if (Defense.dangerousBallTowardsDefense() || this._opp == passReceiver) {
				let defenseAreaIntersection = Field.intersectRayDefenseArea(World.Ball.pos, World.Ball.speed, 0, true)[0];
				if (defenseAreaIntersection && World.Ball.pos.distanceTo(defenseAreaIntersection)
						> World.Ball.pos.distanceTo(this._robot.pos)
						&&  (this._robot.pos - World.Ball.pos).dot(World.Ball.speed) > 0) {
					return [Duel];
				}
			}
		}

		let color = World.TeamIsBlue ? vis.colors.blueHalf : vis.colors.yellowHalf
		vis.addCircle("a/d/manmark: Target", dest, 0.1, color);
		vis.addPath("a/d/manmark: Target", [this._robot.pos, dest, this._opp.pos], color);

		// use centerback positioning if the destination pos would be too close to our defense area
		let markingPosDefenseDist = Field.distanceToFriendlyDefenseArea(dest, this._opp.radius);
		let markingPosNearLow = Defense.centerBackDistanceToDefenseArea() + Defense.MARKING_DISTANCE;
		let markingPosNearHigh = markingPosNearLow + 2 * this._robot.radius;
		let markingPosThreshold = wasCenterback ? markingPosNearHigh : markingPosNearLow;
		let oppDefenseDist = Field.distanceToFriendlyDefenseArea(this._opp.pos, this._opp.radius);
		if (markingPosDefenseDist < markingPosThreshold || oppDefenseDist <= 0 || Referee.isStopState() || Referee.isFriendlyFreeKickState()
				 ||  World.RefereeState === "KickoffOffensivePrepare" || World.RefereeState === "KickoffOffensive") {
			this._wasCenterback = true;
			// for interpreting debug outputs
			this._manmarkInfo.id = this._opp.id;
			this._manmarkInfo.pos = dest;
			return [CenterBack, [ this._manmarkInfo ], this._restartTask];
		}

		// if we are still near the defense area but want to move away, disguise as a centerback
		let selfDefenseDist = Field.distanceToFriendlyDefenseArea(this._robot.pos, this._robot.radius);
		if (selfDefenseDist < Defense.centerBackDistanceToDefenseArea() + this._robot.radius + 0.03) {
			// TODO EVACUATE
			this._messaging.sendToTrainerRepeated(MessageType.groupApplication, { name: "centerback", payload: undefined });
		}

		return [ManMarkTask, [ this._opp ], this._restartTask];
	}
}