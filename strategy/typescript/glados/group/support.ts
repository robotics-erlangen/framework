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
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { Objective } from "glados/agent/base/objective";
import { MessageBox, MessageType } from "glados/control/messaging";
import { RobotLike } from "glados/observer/physics";
import { Group } from "glados/trainer/groups";
import * as UtilZone from "glados/util/zone";

const G = World.Geometry;

export class Support implements Group {
	public readonly name = "support";

	private _supportCount = 0;

	private _zones: UtilZone.Zone[] = [];
	private _emptyZone: UtilZone.Zone | undefined;

	private _lastMainAttacker: FriendlyRobot | undefined;
	private _lastRobots: FriendlyRobot[] | undefined;
	private _lastAssignments: Map<UtilZone.Zone, FriendlyRobot> | undefined = undefined;

	private _objective: Objective | undefined = undefined;

	private _chooseEmptyZone(mainAttackerPos?: Position) {
		let emptyZoneHysteresis = this._emptyZone ? 0.2 : 0;
		if (mainAttackerPos != undefined) {
			for (let zone of this._zones) {
				// make all zones smaller
				// makes keeping the old zone likelier, since it wont be changed if the condition is never true
				if (UtilZone.isInZone(mainAttackerPos, zone, -emptyZoneHysteresis)) {
					this._emptyZone = zone;
					break;
				}
			}
		}

		// Use zeroth zone as default empty zone
		if (!this._emptyZone && this._zones.length > 0) {
			this._emptyZone = this._zones[0];
		}
	}

	public run(messaging: MessageBox, messages: Map<FriendlyRobot, undefined>) {
		const [, objective] = messaging.receiveSingleSender(MessageType.selectedObjective);
		if (!objective) {
			return;
		}

		let robots = Array.from(messages.keys());
		let mainAttacker = messaging.receiveTrainer(MessageType.mainAttacker);
		let prevEmptyZone = this._emptyZone;

		// if the mainAttacker changes, assume that the previous mainAttacker becomes a supporter instead
		let robotsTmp: FriendlyRobot[] = [];
		for (let robot of robots) {
			if (robot === mainAttacker && this._lastMainAttacker) {
				robotsTmp.push(this._lastMainAttacker);
			} else {
				robotsTmp.push(robot);
			}
		}
		robots = robotsTmp;

		// update assignments if necessary
		let updateAssignments = this._lastRobots == undefined || this._lastAssignments == undefined || robots.length !== this._lastRobots.length;
		if (!updateAssignments) {
			for (let i = 0; i < robots.length; i++) {
				if (robots[i] !== (this._lastRobots as FriendlyRobot[])[i]) {
					updateAssignments = true;
					break;
				}
			}
		}

		// choose which zone is occupied by the mainAttacker
		let mainAttackerPos: Position | undefined = undefined;
		if (mainAttacker) {
			mainAttackerPos = messaging.receiveSingleSender(MessageType.attackPosition)[1] || mainAttacker.pos;
		}

		// check if the main attacker entered another zone than its own
		// this is better than checking if it left the empty zone, because it can leave the empty zone without
		// necessarily entering another zone and we don't want to recompute the zones in that case
		const mainAttackerPosChangedZone = mainAttackerPos !== undefined
			&& this._zones.filter((zone) => zone !== this._emptyZone)
				.some((zone) => UtilZone.isInZone(mainAttackerPos!, zone, -0.3));

		// update zones if necessary
		if (robots.length !== this._supportCount || this._objective !== objective || mainAttackerPosChangedZone) {
			this._supportCount = robots.length;
			this._zones = objective.getSupporterZones(robots, mainAttackerPos);
			// reset empty zone hysteresis
			this._emptyZone = undefined;

			this._objective = objective;

			updateAssignments = true;
		}
		this._chooseEmptyZone(mainAttackerPos);

		// update assignments if empty zone changed
		updateAssignments = updateAssignments || this._emptyZone !== prevEmptyZone;

		// assign the zones to the nearest supporters
		let robotPositions = new Map<FriendlyRobot, RobotLike>(); // robot -> pos
		let passInfoTable = messaging.receiveSingleSender(MessageType.passInfo)[1];
		for (let r of robots) {
			let pos = r.pos;
			if (passInfoTable) {
				for (let passInfo of passInfoTable) {
					if (passInfo.target === r) {
						pos = passInfo.ballPos + (passInfo.ballPos - World.Ball.pos).withLength(r.shootRadius + World.Ball.radius);
					}
				}
			}
			robotPositions[r] = { pos, speed: r.speed, maxSpeed: r.maxSpeed, acceleration: r.acceleration };
		}

		let zoneList: UtilZone.Zone[] = []; // { zone }
		for (let zone of this._zones) {
			if (zone !== this._emptyZone) {
				zoneList.push(zone);
				const color = World.TeamIsBlue ? vis.colors.skyBlue : vis.colors.gold;
				vis.addPolygon("g/support: Zones", UtilZone.zoneToPolygon(zone), color);
			}
		}

		let robotZones;
		if (updateAssignments) {
			robotZones = UtilZone.assignRobotsToZones(robotPositions, zoneList, this._lastAssignments);
			if (!amun.isPerformanceMode) {
				for (const [zone, robot] of robotZones.entries()) {
					vis.addPath("g/support: Zone assignment", [zone.defaultPos, robot.pos], vis.colors.white);
				}
			}
		} else {
			robotZones = this._lastAssignments!;
		}

		for (let [zone, robot] of robotZones.entries()) {
			messaging.send(MessageType.supportZone, robot, zone);
		}


		this._lastMainAttacker = mainAttacker;
		this._lastRobots = robots;
		this._lastAssignments = robotZones;
	}
}
