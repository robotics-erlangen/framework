import * as debug from "base/debug";
import * as Referee from "base/referee";
import { FriendlyRobot } from "base/robot";
import * as vis from "base/vis";
import * as World from "base/world";

import { ExclusiveRole, MessageBox, MessageType } from "glados/control/messaging";
import * as Attack from "glados/util/attack";
import * as UtilObjective from "glados/util/objective";
import { LeveledRating } from "glados/util/rating";

export type ExclusiveRoleApplication = [ExclusiveRole, LeveledRating];

const ROLE_HYSTERESIS = 0.05;

const EXCLUSIVE_ROLE_START: { [K in ExclusiveRole]?: (messaging: MessageBox, winner: FriendlyRobot) => void } = {
	[MessageType.mainAttacker]: (messaging, winner) => {
		const lastIncomingPassInfo = Attack.lastIncomingPassInfo(
			winner, messaging.receiveSingleSender(MessageType.passInfo));

		// Use the position where we plan to receive the pass if available
		const pos = UtilObjective.nextBallPosition(lastIncomingPassInfo);
		const objectiveCtor = UtilObjective.selectNewObjective({ pos });
		if (!objectiveCtor) {
			return;
		}

		const [, oldObjective] = messaging.receiveSingleSender(MessageType.selectedObjective);

		let objective;
		if (oldObjective instanceof objectiveCtor) {
			debug.set("trainer objective/continue", true);
			objective = oldObjective;
		} else {
			debug.set("trainer objective/continue", false);
			objective = new objectiveCtor();
		}

		debug.set("trainer objective", objective.toString());
		/* There probably currently is a main attacker that already sent an
		 * objective.
		 *
		 * TODO Replace impersonation with something else. This may require the
		 * receiveSingleSender to specify receiveOwn
		 */
		messaging.cancel(MessageType.selectedObjective);
		messaging.sendBroadcast(MessageType.selectedObjective, objective, winner);
	},
};

export class Roles {
	_exclusiveRoles: Map<ExclusiveRole, FriendlyRobot> = new Map<ExclusiveRole, FriendlyRobot>();

	_messaging: MessageBox;

	constructor(messaging: MessageBox) {
		this._messaging = messaging;
	}

	_chooseExclusiveRoles() {
		let roleHysteresis = ROLE_HYSTERESIS;
		if (Referee.isStopState()) {
			roleHysteresis = 1;
		}

		let roleMsgs = this._messaging.receiveRepeated(MessageType.exclusiveRole);
		let roleApplications: Map<ExclusiveRole, Map<FriendlyRobot, LeveledRating>> = new Map<ExclusiveRole, Map<FriendlyRobot, LeveledRating>>();
		for (let [robot, applications] of roleMsgs.entries()) {
			for (let [role, rating] of applications) {
				if (!roleApplications.has(role)) {
					roleApplications[role] = new Map<FriendlyRobot, LeveledRating>();
				}
				if (roleApplications[role]!.get(robot)) {
					throw new Error(`Robot ${robot.id} applies twice for ${MessageType[role]}`);
				}
				roleApplications[role]!.set(robot, LeveledRating.clone(rating));
			}
		}

		debug.pushtop("Exclusive Role Rating");

		let exclusiveRoles: Map<ExclusiveRole, FriendlyRobot> = new Map<ExclusiveRole, FriendlyRobot>(); // ensure that special roles are removed if no one applies
		for (let [role, applications] of roleApplications.entries()) {
			if (this._exclusiveRoles.has(role) && applications.has(this._exclusiveRoles[role]!)) {
				let v = applications[this._exclusiveRoles[role]!]!;
				for (let i = 0;i < v._ratingArray.length;i++) {
					if (v._ratingArray[i] != undefined) {
						v._ratingArray[i]! += roleHysteresis;
					}
				}
			}
			debug.push(MessageType[role]);
			for (let [robot, application] of applications.entries()) {
				debug.set("" + (robot.id), application._ratingArray);
			}
			debug.pop(); // role
			let bestRobot = LeveledRating.findBestRating(applications);
			if (bestRobot) {
				/* Either there was noone in this exclusive role or the robot
				 * changed
				 */
				if (this._exclusiveRoles[role] !== bestRobot) {
					EXCLUSIVE_ROLE_START[role]?.(this._messaging, bestRobot);
				}

				exclusiveRoles[role] = bestRobot;
				this._messaging.sendBroadcast(role, bestRobot);

				vis.addCircle("tr/roles: " + MessageType[role], bestRobot.pos, 0.12,
					World.TeamIsBlue ? vis.colors.blue : vis.colors.yellow, true, true);
			}
		}

		debug.pop(); // exclusive role rating

		this._exclusiveRoles = exclusiveRoles;
	}
}
