import * as Constants from "base/constants";
import * as debug from "base/debug";
import { FriendlyRobot } from "base/robot";
import * as vis from "base/vis";

import { Position, Vector } from "base/vector";
import * as World from "base/world";
import { MessageBox, MessageType } from "glados/control/messaging";

const G = World.Geometry;

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

let getDefaultPosition = function(boundaries: Boundaries) {
	let zoneWidth = Math.abs(boundaries.right - boundaries.left);
	let zoneHeight = Math.abs(boundaries.top - boundaries.bottom);

	let isInTopHalf = Math.abs(boundaries.right) > Math.abs(boundaries.left);
	let fraction = isInTopHalf ? 1 / 8 : 7 / 8;

	return new Vector(boundaries.right - zoneWidth * fraction, boundaries.bottom + zoneHeight * 2 / 3);
};

function visualizeZone(zone: Zone) {
	let visFlag = true;

	if (visFlag) {
		let edge = 0.05;
		let left = zone.boundaries.left + edge;
		let right = zone.boundaries.right - edge;
		let top = zone.boundaries.top - edge;
		let bottom = zone.boundaries.bottom + edge;
		let points = [ new Vector(left, top), new Vector(left, bottom), new Vector(right, bottom), new Vector(right, top) ];
		vis.addPolygon("g/Midfield: Zones", points, vis.colors.orchid);
	}
}

function assignRobotsToZones(robotPositions: Map<FriendlyRobot, Position>, zones: Zone[]): Map<Zone, FriendlyRobot> {
	let n = zones.length;
	if (n === 0) {
		return new Map<Zone, FriendlyRobot>();
	}

	let zoneAssignment = new Map<Zone, FriendlyRobot>();
	for (let zone of zones) {
		let minDist = Infinity;
		let closestRobot = undefined;
		for (let [robot, pos] of robotPositions.entries()) {
			if (pos == undefined) {
				break;
			}
			let dist = pos.distanceToSq(zone.defaultPos);
			if (dist < minDist) {
				minDist = dist;
				closestRobot = robot;
			}
		}
		if (closestRobot) {
			zoneAssignment[zone] = closestRobot;
			robotPositions.delete(closestRobot);
		}
	}

	return zoneAssignment;
}

export class Midfield {
	public name: string = "midfield";
	private _farAwayHyst: boolean = false; // the ball is far in our own half and we need midfielders to move forward
	private _noMidfielderHyst: boolean = false; // we are attacking the goal and dont want midfielders at all

	private _zones: Zone[] = [];
	private _topHalfHyst: boolean = false;

	private _lastMainAttacker: FriendlyRobot | undefined;
	private _lastRobots: FriendlyRobot[] | undefined;
	private _lastAssignments: Map<Zone, FriendlyRobot> | undefined;

	private _determineMidfielderCount(nAttackers: number): number {
		let nMidfielders;
		let thresholdY = this._farAwayHyst ? -1 : -2.5;
		if (World.Ball.pos.y < thresholdY) {
			this._farAwayHyst = true;
			nMidfielders = 2;
		} else {
			this._farAwayHyst = false;
			nMidfielders = 1;
		}

		thresholdY = this._noMidfielderHyst ? 0 : 1;
		if (World.Ball.pos.y > thresholdY) {
			this._noMidfielderHyst = true;
			nMidfielders = 0;
		} else {
			this._noMidfielderHyst = false;
			nMidfielders = nMidfielders != undefined ? nMidfielders : 1;
		}

		if (nAttackers <= nMidfielders) {
			nMidfielders = nAttackers - 1;
		}

		return nMidfielders;
	}

	private _updateZones(nMidfielders: number): boolean {
		this._zones = [];

		let topHalfThreshold = this._topHalfHyst ? 1 : 0;
		let isInTopHalf = World.Ball.pos.x < topHalfThreshold;

		let updateAssignments = this._topHalfHyst !== isInTopHalf;

		this._topHalfHyst = isInTopHalf;

		let totalLeft = -G.FieldWidthHalf;

		let remainingZones = nMidfielders;

		let robotRadius = Constants.maxRobotRadius;
		let zoneWidth = G.FieldWidth / 3;
		let top = isInTopHalf ? -1 : 1;
		let verticalOffset = G.FieldWidthHalf / 4;
		let horizontalOffset = G.FieldHeightHalf / 4;

		// two hardcoded zones, depending on the number of robots we have
		if (remainingZones >= 1) {
			let boundaries = {
				bottom: -G.FieldHeightHalf * 3 / 5,
				top: G.FieldWidthHalf / 3,
				left: top * (totalLeft + robotRadius + verticalOffset) + top,
				right: top * (totalLeft + robotRadius + verticalOffset + zoneWidth) + top
			};
			let zone: Zone = {
				defaultPos: getDefaultPosition(boundaries),
				boundaries: boundaries
			};
			remainingZones = remainingZones - 1;
			this._zones.push(zone);
		}

		if (remainingZones >= 1) {
			let boundaries = {
				bottom: -G.FieldHeightHalf * 3 / 5 + horizontalOffset,
				top: G.FieldWidthHalf / 3 + horizontalOffset,
				right: -top * (totalLeft + robotRadius + verticalOffset + zoneWidth) + top,
				left: -top * (totalLeft + robotRadius + verticalOffset) + top
			};
			let zone: Zone = {
				defaultPos: getDefaultPosition(boundaries),
				boundaries: boundaries
			};
			this._zones.push(zone);
		}

		return updateAssignments;
	}



	public run(messaging: MessageBox, messages: Map<FriendlyRobot, any>) {
		let robots = Array.from(messages.keys());
		let mainAttacker = messaging.receiveTrainer(MessageType.mainAttacker);

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

		let numAttackers = messaging.receive(MessageType.attackerFlag).size;
		let remainingMidfielders = this._determineMidfielderCount(numAttackers);
		if (this._lastAssignments && this._lastAssignments.size !== remainingMidfielders) {
			updateAssignments = this._updateZones(remainingMidfielders) || updateAssignments;
		}
		updateAssignments = updateAssignments || this._lastRobots != undefined && this._lastRobots.length !== remainingMidfielders;




		// assign the zones to the nearest Midfields
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

		if (mainAttacker) {
			robotPositions[mainAttacker] = mainAttacker.pos;
		}

		let zoneList: Zone[] = [];
		for (let zone of this._zones) {
			visualizeZone(zone);
			zoneList.push(zone);
		}

		let robotZones;
		if (mainAttacker && updateAssignments) {
			robotZones = assignRobotsToZones(robotPositions, zoneList);// updateAssignments and <- or this._lastAssignments
		} else {
			robotZones = this._lastAssignments;
		}

		debug.set("Midfield Zones", robotZones);

		if (robotZones) {
			for (let [zone, robot] of robotZones) {
				if (remainingMidfielders <= 0) {
					break;
				}
				messaging.send(MessageType.midfieldZone, robot, zone);
				remainingMidfielders = remainingMidfielders - 1;
			}
		}

		this._lastMainAttacker = mainAttacker;
		this._lastRobots = robots;
		this._lastAssignments = robotZones;
	}

}
