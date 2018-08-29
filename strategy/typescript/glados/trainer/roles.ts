import * as Referee from "base/referee";
import {FriendlyRobot} from "base/robot";
import * as vis from "base/vis";
import * as World from "base/world";

import {MessageBox, MessageType, ExclusiveRole} from "glados/control/messaging";


const ROLE_HYSTERESIS = 0.05;

export class Roles {
	_exclusiveRoles: Map<ExclusiveRole, FriendlyRobot> = new Map<ExclusiveRole, FriendlyRobot>();

	_messaging: MessageBox;

	constructor(messaging: MessageBox) {
		this._messaging = messaging;
	}

	_chooseExclusiveRoles () {
		let roleHysteresis = ROLE_HYSTERESIS;
		if (Referee.isStopState()) {
			roleHysteresis = 1;
		}

		let roleMsgs = this._messaging.receiveRepeated(MessageType.exclusiveRole);
		let roleApplications: Map<ExclusiveRole, Map<FriendlyRobot, number>> = new Map<ExclusiveRole, Map<FriendlyRobot, number>>();
		for (let [robot, applications] of roleMsgs.entries()) {
			for (let [role, rating] of applications) {
				if (!roleApplications.has(role)) {
					roleApplications[role] = new Map<FriendlyRobot, number>();
				}
				roleApplications[role]!.set(robot, rating);
			}
		}

		let exclusiveRoles: Map<ExclusiveRole, FriendlyRobot> = new Map<ExclusiveRole, FriendlyRobot>(); // ensure that special roles are removed if no one applies
		for (let [role, applications] of roleApplications.entries()) {
			let bestRobot = undefined;
			let bestRating = -Infinity;
			for (let [robot, rating] of applications.entries()) {
				if (this._exclusiveRoles[role] === robot) {
					rating += roleHysteresis;
				}
				if (rating > bestRating) {
					bestRobot = robot;
					bestRating = rating;
				}
			}
			if (bestRobot) {
				exclusiveRoles[role] = bestRobot;
				this._messaging.sendBroadcast(role, bestRobot);

				vis.addCircle("tr/roles: "+role, bestRobot.pos, 0.12,
					World.TeamIsBlue ? vis.colors.blue : vis.colors.yellow, true, true);
			}
		}
		this._exclusiveRoles = exclusiveRoles;
	}
}