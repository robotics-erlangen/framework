import * as Constants from "base/constants";
import * as debug from "base/debug";
import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { MessageBox, MessageType } from "glados/control/messaging";
import { Group } from "glados/trainer/groups";
import * as Attack from "glados/util/attack";
import { getRandomPosition, Zone, zoneToPolygon } from "glados/util/zone";

const G = World.Geometry;

const VISUALIZE_ZONES = true;

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

export class Midfield implements Group {
	readonly name = "midfield";
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
		let additionalOffset = G.FieldWidth / 9;

		// two hardcoded zones, depending on the number of robots we have
		if (remainingZones >= 1) {
			let xBound1 = top * (totalLeft + robotRadius + verticalOffset + additionalOffset);
			let xBound2 = top * (totalLeft + robotRadius + verticalOffset + zoneWidth + additionalOffset);
			let boundaries = {
				bottom: -G.FieldHeightHalf * 3 / 5,
				top: G.FieldWidthHalf / 3,
				left: Math.min(xBound1, xBound2),
				right: Math.max(xBound1, xBound2)
			};
			let zone: Zone = {
				defaultPos: getRandomPosition(boundaries),
				boundaries
			};
			remainingZones = remainingZones - 1;
			this._zones.push(zone);
		}

		if (remainingZones >= 1) {
			// ensure that right > left
			let xBound1 = -top * (totalLeft + robotRadius + verticalOffset - additionalOffset);
			let xBound2 = -top * (totalLeft + robotRadius + verticalOffset + zoneWidth - additionalOffset);
			let boundaries = {
				bottom: -G.FieldHeightHalf * 3 / 5 + horizontalOffset,
				top: G.FieldWidthHalf / 3 + horizontalOffset,
				left: Math.min(xBound1, xBound2),
				right: Math.max(xBound1, xBound2)
			};
			let zone: Zone = {
				defaultPos: getRandomPosition(boundaries),
				boundaries
			};
			this._zones.push(zone);
		}

		return updateAssignments;
	}



	public run(messaging: MessageBox, messages: Map<FriendlyRobot, undefined>) {
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
					if (passInfo.target === r && Attack.checkPassInfos(r, passInfoTable, false)[0]) {
						pos = passInfo.ballPos + (passInfo.ballPos - World.Ball.pos).withLength(r.shootRadius + World.Ball.radius);
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
			if (VISUALIZE_ZONES) {
				vis.addPolygon("g/midfield: Zones", zoneToPolygon(zone), vis.colors.orchid);
			}
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
