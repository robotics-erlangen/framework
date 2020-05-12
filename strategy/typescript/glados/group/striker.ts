import * as Field from "base/field";
import * as MathUtil from "base/mathutil";
import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { MessageBox, MessageType } from "glados/control/messaging";
import { Group } from "glados/trainer/groups";
import * as MovesHelper from "glados/util/moveshelper";

let G = World.Geometry;

interface Boundaries {
	right: number;
	left: number;
	top: number;
	bottom: number;
}

interface Zone {
	boundaries: Boundaries;
	defaultPos: Position;
}

function getDefaultPosition(boundaries: Boundaries): Position {
	const zoneWidth = boundaries.right - boundaries.left;
	const zoneHeight = boundaries.top - boundaries.bottom;
	let x, y;
	do {
		x = (MathUtil.random() * 0.6 + 0.2) * zoneWidth + boundaries.left;
		y = (MathUtil.random() * 0.6 + 0.2) * zoneHeight + boundaries.bottom;
	} while (Field.isInOpponentDefenseArea(new Vector(x, y), 0.2));
	return new Vector(x, y);
}

function visualizeZone(zone: Zone) {
	let edge = 0.05;
	let left = zone.boundaries.left + edge;
	let right = zone.boundaries.right - edge;
	let top = zone.boundaries.top - edge;
	let bottom = zone.boundaries.bottom + edge;
	let points = [ new Vector(left, top), new Vector(left, bottom), new Vector(right, bottom), new Vector(right, top) ];
	vis.addPolygon("g/striker: Zones", points, vis.colors.gold);
}

function assignRobotsToZones(robotPositions: Map<FriendlyRobot, Position>, zones: Zone[]): Map<Zone, FriendlyRobot> {
	let n = zones.length;
	if (n === 0) {
		return new Map<Zone, FriendlyRobot>();
	}

	let positions: {pos: Position}[] = [];
	let robots: FriendlyRobot[] = [];
	for (let [robot, robotPos] of robotPositions.entries()) {
		positions.push({pos: robotPos});
		robots.push(robot);
	}
	let zonePositions: Position[] = [];
	for (let zone of zones) {
		zonePositions.push(zone.defaultPos);
	}
	let assignment = MovesHelper.assignRobots(positions, zonePositions);

	let zoneAssignment: Map<Zone, FriendlyRobot> = new Map<Zone, FriendlyRobot>();
	for (let i = 0;i < zones.length;i++) {
		const zone = zones[i];
		zoneAssignment[zone] = robots[assignment[i]];
	}

	// visualize assignments
	if (!amun.isPerformanceMode) {
		for (let [zone, robot] of zoneAssignment.entries()) {
			vis.addPath("g/striker: zone assignment", [zone.defaultPos, robot.pos], vis.colors.white);
		}
	}
	return zoneAssignment;
}

export class Striker implements Group {
	readonly name = "striker";

	_strikerCount: number = 0;

	_zones: Zone[] = [];
	_emptyZone: Zone | undefined;

	_lastMainAttacker: FriendlyRobot | undefined;
	_lastRobots: FriendlyRobot[] | undefined;
	_lastAssignments: Map<Zone, FriendlyRobot> | undefined = undefined;


	_updateZones(robots: FriendlyRobot[]) {
		let totalLeft = -G.FieldWidthHalf;
		let totalRight = G.FieldWidthHalf;
		let totalTop = G.FieldHeightHalf;
		let totalBottom = -G.FieldHeightQuarter;

		let nStrikers = robots.length;
		let remainingZones = nStrikers + 1; // one zone will stay empty
		this._strikerCount = nStrikers;

		// reset the zones
		this._zones = [];
		if (remainingZones === 0) {
			return;
		}

		// create midfield zone
		{
			let boundaries = { left: totalLeft, right: totalRight, top: G.FieldHeightHalf / 4, bottom: totalBottom };
			let defaultPos = getDefaultPosition(boundaries);
			this._zones.push({boundaries: boundaries, defaultPos: defaultPos});
			remainingZones = remainingZones - 1;
		}

		// create offensive zones
		let zoneWidth = (totalRight - totalLeft) / remainingZones;
		for (let i = 1;i <= remainingZones;i++) {
			let boundaries = { left: totalLeft + (i - 1) * zoneWidth, right: totalLeft + i * zoneWidth,
					top: totalTop, bottom: G.FieldHeightHalf / 4 };
			let defaultPos = getDefaultPosition(boundaries);
			this._zones.push({boundaries: boundaries, defaultPos: defaultPos});
		}

		// reset empty zone hysteresis
		this._emptyZone = undefined;
	}

	_chooseEmptyZone(mainAttackerPos?: Position) {
		let emptyZoneHysteresis = this._emptyZone ? 0.2 : 0;
		if (mainAttackerPos != undefined) {
			for (let zone of this._zones) {
				if (mainAttackerPos.x >= zone.boundaries.left + emptyZoneHysteresis
						&&  mainAttackerPos.x <= zone.boundaries.right - emptyZoneHysteresis
						&&  mainAttackerPos.y >= zone.boundaries.bottom + emptyZoneHysteresis
						&&  mainAttackerPos.y <= zone.boundaries.top - emptyZoneHysteresis) {
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

	run(messaging: MessageBox, messages: Map<FriendlyRobot, any>) {
		let robots = Array.from(messages.keys());
		let mainAttacker = messaging.receiveTrainer(MessageType.mainAttacker);
		let prevEmptyZone = this._emptyZone;

		// if the mainAttacker changes, assume that the previous mainAttacker becomes a striker instead
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
		if (robots.length !== this._strikerCount) {
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

		// assign the zones to the nearest strikers
		let robotPositions = new Map<FriendlyRobot, Position>(); // robot -> pos
		let passInfoTable = messaging.receiveSingleSender(MessageType.passInfo)[1];
		for (let r of robots) {
			let pos = r.pos;
			if (passInfoTable) {
				for (let passInfo of passInfoTable) {
					if (passInfo.target === r) {
						pos = passInfo.ballPos + (passInfo.ballPos - World.Ball.pos).setLength(r.shootRadius + World.Ball.radius);
					}
				}
			}
			robotPositions[r] = pos;
		}

		let zoneList: Zone[] = []; // { zone }
		for (let zone of this._zones) {
			if (zone !== this._emptyZone) {
				zoneList.push(zone);
				visualizeZone(zone);
			}
		}

		let robotZones = updateAssignments ? assignRobotsToZones(robotPositions, zoneList) : <Map<Zone, FriendlyRobot>> this._lastAssignments;

		for (let [zone, robot] of robotZones.entries()) {
			messaging.send(MessageType.strikerZone, robot, zone);
		}


		this._lastMainAttacker = mainAttacker;
		this._lastRobots = robots;
		this._lastAssignments = robotZones;
	}
}
