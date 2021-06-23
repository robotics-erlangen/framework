import * as Referee from "base/referee";
import { FriendlyRobot } from "base/robot";
import * as World from "base/world";

import { Attacker } from "glados/agent/attacker";
import { Agent } from "glados/agent/base/agent";
import { Checkable, MainAttackerParameters } from "glados/agent/base/behavior";
import { MessageType } from "glados/control/messaging";
import * as Robot from "glados/observer/robot";
import * as Attack from "glados/util/attack";
import * as Defense from "glados/util/defense";

export class ApplyForMainattacker implements Checkable {
	private _agent: Attacker;
	private _robot: FriendlyRobot;
	private _applying = false;
	private _mainAttackerParameters?: MainAttackerParameters;

	private get _messaging() {
		return this._agent.messaging();
	}

	constructor(agent: Agent) {
		if (!(agent instanceof Attacker)) {
			throw new Error("a/a/applyformainattacker may only be used on attackers");
		}
		this._agent = agent;
		this._robot = agent.robot();
	}

	check(): undefined {
		if (Referee.isOpponentPenaltyState()) {
			this._applying = false;
			return undefined;
		}

		// prevent double touches after a failed freekick by preventing the freekicking robot as mainattacker
		if (!Referee.isFriendlyFreeKickState() && Robot.ownStandardShooter() === this._robot) {
			this._applying = false;
			return undefined;
		}

		let applying = false;
		let [sender, passInfoTable] = this._messaging.receiveSingleSender(MessageType.passInfo, true);

		const isCPMA = Attack.currentPlannedMainAttacker(sender, passInfoTable!) === this._robot;
		const isMainAttacker = this._messaging.receiveTrainer(MessageType.mainAttacker) === this._robot;
		const isShootingFreekick = Referee.isFriendlyFreeKickState() && isMainAttacker;

		if (isCPMA || isShootingFreekick) {
			this._mainAttackerParameters = [undefined, undefined, 2];
			this._agent.beOffensive = true;
			applying = true;
		} else {
			if (!Defense.dangerousBallTowardsDefense(true)) {
				this._mainAttackerParameters = [undefined, undefined, undefined];
				this._agent.beOffensive = false;
				applying = true;
			} else {
				let robotDistToGoal = this._robot.pos.distanceTo(World.Geometry.OpponentGoal);
				let ballDistToGoal = World.Ball.pos.distanceTo(World.Geometry.OpponentGoal);
				let maxDistDiff = (this._applying ? -1 : 1) * (World.Ball.radius + this._robot.shootRadius);
				if (robotDistToGoal - ballDistToGoal > maxDistDiff) {
					this._mainAttackerParameters = [undefined, undefined, undefined];
					this._agent.beOffensive = false;
					applying = true;
				}
			}
		}
		this._applying = applying;
		return undefined;
	}

	mainAttackerParameters(): [MainAttackerParameters | undefined, false] {
		return [this._mainAttackerParameters, false];
	}

	clearMainAttackerParameters() {
		this._mainAttackerParameters = undefined;
	}

	agent() {
		return this._agent;
	}

	setAgent(agent: Agent) {
		if (this._agent.robot() !== agent.robot()) {
			throw new Error("Can't reuse checkable with different robot");
		}
		if (!(agent instanceof Attacker)) {
			throw new Error("a/a/applyformainattacker may only be used on attackers");
		}
		agent.beOffensive = this._agent.beOffensive;
		this._agent = agent;
	}
}
