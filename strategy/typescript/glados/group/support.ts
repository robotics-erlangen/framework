import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { MessageBox, MessageType } from "glados/control/messaging";
import { Group } from "glados/trainer/groups";
import * as UtilZone from "glados/util/zone";

let G = World.Geometry;

export class Support implements Group {
	readonly name = "support";

	_supportCount = 0;

	_zones: UtilZone.Zone[] = [];
	_emptyZone: UtilZone.Zone | undefined;

	_lastMainAttacker: FriendlyRobot | undefined;
	_lastRobots: FriendlyRobot[] | undefined;
	_lastAssignments: Map<UtilZone.Zone, FriendlyRobot> | undefined = undefined;


	_updateZones(robots: FriendlyRobot[]) {
		let totalLeft = -G.FieldWidthHalf;
		let totalRight = G.FieldWidthHalf;
		let totalTop = G.FieldHeightHalf;
		let totalBottom = -G.FieldHeightQuarter;

		let nSupporter = robots.length;
		let remainingZones = nSupporter + 1; // one zone will stay empty
		this._supportCount = nSupporter;

		// reset the zones
		this._zones = [];

		// create midfield zone
		{
			let boundaries = { left: totalLeft, right: totalRight, top: G.FieldHeightHalf / 4, bottom: totalBottom };
			let defaultPos = UtilZone.getRandomPosition(boundaries);
			this._zones.push({boundaries: boundaries, defaultPos: defaultPos});
			remainingZones = remainingZones - 1;
		}

		// create offensive zones
		let zoneWidth = (totalRight - totalLeft) / remainingZones;
		for (let i = 1;i <= remainingZones;i++) {
			let boundaries = { left: totalLeft + (i - 1) * zoneWidth, right: totalLeft + i * zoneWidth,
					top: totalTop, bottom: G.FieldHeightHalf / 4 };
			let defaultPos = UtilZone.getRandomPosition(boundaries);
			this._zones.push({boundaries: boundaries, defaultPos: defaultPos});
		}

		// reset empty zone hysteresis
		this._emptyZone = undefined;
	}

	_chooseEmptyZone(mainAttackerPos?: Position) {
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

		// default: midfield zone is empty
		if (!this._emptyZone && this._zones.length > 0) {
			this._emptyZone = this._zones[0];
		}
	}

	run(messaging: MessageBox, messages: Map<FriendlyRobot, undefined>) {
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
			for (let i = 0;i < robots.length;i++) {
				if (robots[i] !== (this._lastRobots as FriendlyRobot[])[i]) {
					updateAssignments = true;
					break;
				}
			}
		}

		// update zones if necessary
		if (robots.length !== this._supportCount) {
			updateAssignments = true;
			this._updateZones(robots);
		}

		// choose which zone is occupied by the mainAttacker
		let mainAttackerPos = undefined;
		if (mainAttacker) {
			mainAttackerPos = messaging.receiveSingleSender(MessageType.attackPosition)[1] || mainAttacker.pos;
		}
		this._chooseEmptyZone(mainAttackerPos);

		// update assignments if empty zone changed
		updateAssignments = updateAssignments || this._emptyZone !== prevEmptyZone;

		// assign the zones to the nearest supporters
		let robotPositions = new Map<FriendlyRobot, Position>(); // robot -> pos
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
			robotPositions[r] = pos;
		}

		let zoneList: UtilZone.Zone[] = []; // { zone }
		for (let zone of this._zones) {
			if (zone !== this._emptyZone) {
				zoneList.push(zone);
				vis.addPolygon("g/support: Zones", UtilZone.zoneToPolygon(zone), vis.colors.gold);
			}
		}

		let robotZones;
		if (updateAssignments) {
			robotZones = UtilZone.assignRobotsToZones(robotPositions, zoneList);
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
