import * as Field from "base/field";
import * as MathUtil from "base/mathutil";
import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";

import { RobotLike } from "glados/observer/physics";
import * as MovesHelper from "glados/util/moveshelper";

export interface Boundaries {
	right: number;
	left: number;
	top: number;
	bottom: number;
}

export interface Zone {
	boundaries: Boundaries;
	defaultPos: Position;
}

/**
 * Determines whether a given position is in a zone, extended by a boundary width
 * @param pos - The position to check
 * @param zone - The zone to check for inclusion
 * @param boundaryWidth - The amount to extend the zone boundaries by
 * @returns true iff pos is inside the zone extended by boundaryWidth
 */
export function isInZone(pos: Position, zone: Zone, boundaryWidth = 0): boolean {
	return pos.x >= zone.boundaries.left - boundaryWidth
		&& pos.x <= zone.boundaries.right + boundaryWidth
		&& pos.y >= zone.boundaries.bottom - boundaryWidth
		&& pos.y <= zone.boundaries.top + boundaryWidth;
}

export function zoneToPolygon(zone: Zone): Position[] {
	const edge = 0.05;
	const left = zone.boundaries.left + edge;
	const right = zone.boundaries.right - edge;
	const top = zone.boundaries.top - edge;
	const bottom = zone.boundaries.bottom + edge;
	return [
		[left, top],
		[left, bottom],
		[right, bottom],
		[right, top]
	].map(([x, y]) => new Vector(x, y));
}

export function assignRobotsToZones(robotPositions: Map<FriendlyRobot, RobotLike>, zones: Zone[]): Map<Zone, FriendlyRobot> {
	if (robotPositions.size !== zones.length) {
		throw new Error("Mismatch between robot and zone count");
	}

	if (zones.length === 0) {
		return new Map<Zone, FriendlyRobot>();
	}

	const positions: RobotLike[] = [];
	const robots: FriendlyRobot[] = [];
	for (const [robot, pos] of robotPositions.entries()) {
		positions.push(pos);
		robots.push(robot);
	}
	const zonePositions = zones.map((zone) => zone.defaultPos);

	const assignment = MovesHelper.assignRobots(positions, zonePositions);

	const zoneAssignment = new Map<Zone, FriendlyRobot>();
	zones.forEach((zone, i) => zoneAssignment[zone] = robots[assignment[i]]);
	return zoneAssignment;
}

/**
 * Get a random position inside some boundary.
 * @param boundaries - The zone in which the position will be
 * @param borderWidth - The position will be at least this far away from the edge
 * @returns a Position inside the boundaries
 */
export function getRandomPosition(boundaries: Boundaries, borderWidth = 0.2): Position {
	const randomRange = 1 - 2 * borderWidth;
	const zoneWidth = boundaries.right - boundaries.left;
	const zoneHeight = boundaries.top - boundaries.bottom;
	let pos: Position | undefined;
	const MAX_TRIES = 10;
	for (let i = 0; i < MAX_TRIES; ++i) {
		const x = (MathUtil.random() * randomRange + borderWidth) * zoneWidth + boundaries.left;
		const y = (MathUtil.random() * randomRange + borderWidth) * zoneHeight + boundaries.bottom;
		pos = new Vector(x, y);
		if (!Field.isInOpponentDefenseArea(pos, borderWidth)) {
			return pos;
		}
	}
	pos = Field.limitToAllowedField(pos!);
	return pos;
}
