/*
/// Some field related utility functions
module "Field"
*/

/**************************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer, Christian Lobmeier, *
*       André Pscherer                                                    *
*   Robotics Erlangen e.V.                                                *
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

import * as geom from "base/geom";
import { log } from "base/globals";
import * as MathUtil from "base/mathutil";
import * as Referee from "base/referee";
import { Position, RelativePosition, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

let G: Readonly<World.GeometryType> = World.Geometry;

/// returns the nearest position inside the field (extended by boundaryWidth)
// @name limitToField
// @param pos Vector - the position to limit
// @param boundaryWidth number - how much the field should be extended beyond the borders
// @return Vector - limited vector
export function limitToField(pos: Readonly<Position>, boundaryWidth: number = 0) {

	let allowedHeight = G.FieldHeightHalf + boundaryWidth; // limit height to field
	let y = MathUtil.bound(-allowedHeight, pos.y, allowedHeight);

	let allowedWidth = G.FieldWidthHalf + boundaryWidth; // limit width to field
	let x = MathUtil.bound(-allowedWidth, pos.x, allowedWidth);

	return new Vector(x, y);
}

/// returns the nearest position inside the field without defense areas
// @name limitToAllowedField
// @param extraLimit number - how much the field should be additionally limited
// @param pos Vector - the position to limit
// @return Vector - limited vector
function limitToAllowedField_2017(pos: Readonly<Position>, extraLimit: number = 0): Position {
	let oppExtraLimit = extraLimit;
	if (Referee.isStopState() || Referee.isFriendlyFreeKickState()) {
		oppExtraLimit = oppExtraLimit + G.FreeKickDefenseDist + 0.10;
	}
	pos = limitToField(pos, -extraLimit);
	if (isInFriendlyDefenseArea(pos, extraLimit)) {
		if (Math.abs(pos.x) <= G.DefenseStretchHalf) {
			pos = new Vector(pos.x, -G.FieldHeightHalf + G.DefenseRadius + extraLimit);
		} else {
			let circleMidpoint = new Vector(
				G.DefenseStretchHalf * MathUtil.sign(pos.x), -G.FieldHeightHalf);
			pos = circleMidpoint + (pos - circleMidpoint).setLength(G.DefenseRadius + extraLimit);
		}
		return pos;
	} else if (isInOpponentDefenseArea(pos, oppExtraLimit)) {
		if (Math.abs(pos.x) <= G.DefenseStretchHalf) {
			pos = new Vector(pos.x, G.FieldHeightHalf - G.DefenseRadius - oppExtraLimit);
		} else {
			let circleMidpoint = new Vector(
				G.DefenseStretchHalf * MathUtil.sign(pos.x), G.FieldHeightHalf);
			pos = circleMidpoint + (pos - circleMidpoint).setLength(G.DefenseRadius + oppExtraLimit);
		}
		return pos;
	}
	return pos;
}

function limitToAllowedField_2018(pos: Readonly<Position>, extraLimit: number = 0): Position {
	let oppExtraLimit = extraLimit;
	if (Referee.isStopState() || Referee.isFriendlyFreeKickState()) {
		oppExtraLimit = oppExtraLimit + G.FreeKickDefenseDist + 0.10;
	}
	pos = limitToField(pos, -extraLimit);
	vis.addCircle("1Test", pos, 0.2, vis.colors.green);
	if (isInFriendlyDefenseArea(pos, extraLimit)) {
		let targety = -G.FieldHeightHalf + G.DefenseHeight + extraLimit;
		let targetx = G.DefenseWidthHalf + extraLimit;
		let dy = targety - pos.y;
		let dx = targetx - Math.abs(pos.x);
		if (dx > dy) {
			return new Vector(pos.x, targety);
		} else {
			return new Vector(MathUtil.sign(pos.x) * targetx, pos.y);
		}
	} else if (isInOpponentDefenseArea(pos, oppExtraLimit)) {
		let targety = G.FieldHeightHalf - G.DefenseHeight - oppExtraLimit;
		let targetx = G.DefenseWidthHalf + oppExtraLimit;
		let dy = pos.y - targety;
		let dx = targetx - Math.abs(pos.x);
		if (dx > dy) {
			return new Vector(pos.x, targety);
		} else {
			return new Vector(MathUtil.sign(pos.x) * targetx, pos.y);
		}
	}
	return pos;
}

/// check if pos is inside the field (extended by boundaryWidth)
// @name isInField
// @param pos Vector - the position to limit
// @param boundaryWidth number - how much the field should be extended beyond the borders
// @return bool - is in field
export function isInField(pos: Readonly<Position>, boundaryWidth: number = 0): boolean {
	let allowedHeight = G.FieldHeightHalf + boundaryWidth; // limit height to field
	if (Math.abs(pos.x) > G.GoalWidth / 2 && Math.abs(pos.y) > allowedHeight // check whether robot is inside the goal
			||  Math.abs(pos.y) > allowedHeight + G.GoalDepth) { // handle area behind goal
		return false;
	}

	let allowedWidth = G.FieldWidthHalf + boundaryWidth; // limit width to field
	if (Math.abs(pos.x) > allowedWidth) {
		return false;
	}

	return true;
}

/// Returns the minimum distance to the field borders (extended by boundaryWidth)
// @name distanceToFieldBorders
// @param pos Vector - the position to limit
// @param boundaryWidth number - how much the field should be extended beyond the borders
// @return number - distance to field borders
export function distanceToFieldBorder(pos: Readonly<Position>, boundaryWidth: number = 0): number {
	let allowedWidth = G.FieldWidthHalf + boundaryWidth;
	let dx = allowedWidth - Math.abs(pos.x);

	let allowedHeight = G.FieldHeightHalf + boundaryWidth;
	let dy = allowedHeight - Math.abs(pos.y);

	// returns the minimum of dx and dy
	return MathUtil.bound(0, dx, dy);
}

function distanceToDefenseAreaSq_2018(pos: Readonly<Position>, friendly: boolean): number {
	let defenseMin = new Vector(-G.DefenseWidthHalf,G.FieldHeightHalf - G.DefenseHeight);
	let defenseMax = new Vector(G.DefenseWidthHalf,G.FieldHeightHalf);
	if (friendly) {
		let temp = defenseMin;
		defenseMin = -defenseMax;
		defenseMax = -temp;
	}
	return pos.distanceToSq(geom.boundRect(defenseMin, pos, defenseMax));
}

function isInDefenseArea_2018(pos: Readonly<Position>, radius: number, friendly: boolean): boolean {
	if (radius < 0) {
		let defenseMin = new Vector(-G.DefenseWidthHalf - radius, G.FieldHeightHalf - G.DefenseHeight - radius);
		let defenseMax = new Vector(G.DefenseWidthHalf + radius, G.FieldHeightHalf + radius);
		if (friendly) {
			let temp = defenseMin;
			defenseMin = -defenseMax;
			defenseMax = -temp;
		}
		if (defenseMin.x > defenseMax.x || defenseMin.y > defenseMax.y) {
			return false;
		}
		return geom.insideRect(defenseMin, defenseMax, pos);
	}
	return distanceToDefenseAreaSq_2018(pos, friendly) <= radius * radius;
}

function distanceToDefenseArea_2018(pos: Readonly<Position>, radius: number, friendly: boolean): number {
	let defenseMin = new Vector(-G.DefenseWidthHalf,G.FieldHeightHalf - G.DefenseHeight);
	let defenseMax = new Vector(G.DefenseWidthHalf,G.FieldHeightHalf);
	let distance;
	if (friendly) {
		pos = -pos;
	}
	if (radius < 0 && isInDefenseArea_2018(pos, 0, friendly)) {
		let min = defenseMax.x - pos.x;
		min = Math.min(min, pos.x - defenseMin.x);
		min = Math.min(min, defenseMax.y - pos.y);
		min = Math.min(min, pos.y - defenseMin.y);
		distance = min + radius;
		return Math.max(-distance, 0);
	}
	distance = pos.distanceTo(geom.boundRect(defenseMin, pos, defenseMax)) - radius;
	return Math.max(distance, 0);
}

function distanceToDefenseArea_2017(pos: Readonly<Position>, radius: number, friendly: boolean): number {
	radius = radius + G.DefenseRadius;
	let defenseY = friendly ? -G.FieldHeightHalf : G.FieldHeightHalf;
	let inside = new Vector(MathUtil.bound(-G.DefenseStretchHalf, pos.x, G.DefenseStretchHalf), defenseY);
	let distance = pos.distanceTo(inside) - radius;
	return (distance < 0) ? 0 : distance;
}
function distanceToDefenseAreaSq_2017(pos: Readonly<Position>, friendly: boolean): number {
	let d = distanceToDefenseArea_2017(pos, 0, friendly);
	return d * d;
}

/// check if position is inside/touching the (friendly) defense area
// @name isInDefenseArea
// @param pos Vector - the position to check
// @param radius number - Radius of object to check
// @param friendly bool - selection of Own/Opponent area
// @return bool

function isInDefenseArea_2017(pos: Readonly<Position>, radius: number, friendly: boolean): boolean {
	if (radius < -G.DefenseRadius) {
		return false;
	}
	radius = radius + G.DefenseRadius;
	let defenseY = friendly ? -G.FieldHeightHalf : G.FieldHeightHalf;
	let inside = new Vector(MathUtil.bound(-G.DefenseStretchHalf, pos.x, G.DefenseStretchHalf), defenseY);
	return pos.distanceToSq(inside) <= radius * radius;
}

export let distanceToDefenseAreaSq: (pos: Readonly<Position>, friendly: boolean) => number;
export let distanceToDefenseArea: (pos: Readonly<Position>, radius: number, friendly: boolean) => number;
export let isInDefenseArea: (pos: Readonly<Position>, radius: number, friendly: boolean) => boolean;
export let limitToAllowedField: (pos: Readonly<Position>, radius?: number) => Position;
if (World.RULEVERSION === "2018") {
	distanceToDefenseAreaSq = distanceToDefenseAreaSq_2018;
	distanceToDefenseArea = distanceToDefenseArea_2018;
	isInDefenseArea = isInDefenseArea_2018;
	limitToAllowedField = limitToAllowedField_2018;
} else {
	distanceToDefenseAreaSq = distanceToDefenseAreaSq_2017;
	distanceToDefenseArea = distanceToDefenseArea_2017;
	isInDefenseArea = isInDefenseArea_2017;
	limitToAllowedField = limitToAllowedField_2017;
}


/// check if pos is inside the field (extended by boundaryWidth)
// @name isInAllowedField
// @param pos Vector - the position to check
// @param boundaryWidth number - how much the field should be extended beyond the borders
// @return bool - is in field
export function isInAllowedField(pos: Readonly<Position>, boundaryWidth: number): boolean {
	return isInField(pos, boundaryWidth)  &&
		!isInDefenseArea(pos, -boundaryWidth, true)  &&
		!isInDefenseArea(pos, -boundaryWidth, false);
}

/// Returns true if the position is inside/touching the friendly defense area
// @name isInFriendlyDefenseArea
// @param pos Vector - the position to check
// @param radius number - Radius of object to check
// @return bool
export function isInFriendlyDefenseArea(pos: Readonly<Position>, radius: number): boolean {
	return isInDefenseArea(pos, radius, true);
}

/// Returns true if the position is inside/touching the opponent defense area
// @name isInOpponentDefenseArea
// @param pos Vector - the position to check
// @param radius number - Radius of object to check
// @return bool
export function isInOpponentDefenseArea(pos: Readonly<Position>, radius: number): boolean {
	return isInDefenseArea(pos, radius, false);
}

/// Calculates the distance (between robot hull and field line) to the friendly defense area
// @name distanceToFriendlyDefenseArea
// @param pos Vector - the position to check
// @param radius number - Radius of object to check
// @return number - distance
export function distanceToFriendlyDefenseArea(pos: Readonly<Position>, radius: number) {
	return distanceToDefenseArea(pos, radius, true);
}

/// Calculates the distance (between robot hull and field line) to the opponent defense area
// @name distanceToOpponentDefenseArea
// @param pos Vector - the position to check
// @param radius number - Radius of object to check
// @return number - distance
export function distanceToOpponentDefenseArea(pos: Readonly<Position>, radius: number) {
	return distanceToDefenseArea(pos, radius, false);
}

function insideSector(s: [Vector, Vector], a: Vector): boolean {
	let v1 = (-s[0]).perpendicular(), v2 = s[1].perpendicular();
	let b1 = v1.dot(a) >= 0;
	let b2 = v2.dot(a) >= 0;
	if (v1.dot(s[1]) >= 0) {
		return b1 && b2;
	} else {
		return b1 || b2;
	}
}

function normalize(angle: number): number {
	while (angle >= 2 * Math.PI) {
		angle = angle - 2 * Math.PI;
	}
	while (angle < 0) {
		angle = angle + 2 * Math.PI;
	}
	return angle;
}

function intersectRayArc(pos: Position, dir: RelativePosition, m: Position, r: number, minangle: number, maxangle: number): [Vector, number, number][] {
	let intersections: [Vector, number, number][] = [];
	let [i1, i2, l1, l2] = geom.intersectLineCircle(pos, dir, m, r);
	let interval = normalize(maxangle - minangle);
	if (i1 && l1 >= 0) {
		let a1 = normalize((i1 - m).angle() - minangle);
		if (a1 < interval) {
			intersections.push([i1, a1, l1]);
		}
	}
	if (i2 && l2 != undefined && l2 >= 0) {
		let a2 = normalize((i2 - m).angle() - minangle);
		if (a2 < interval) {
			intersections.push([i2, a2, l2]);
		}
	}
	return intersections;
}

interface IntersectionsType {
	pos: Position;
	way?: number;
	sec?: number;
	l1?: number;
}

function intersectionsRayDefenseArea_2018(pos: Position, dir: RelativePosition, extraDistance: number, friendly: boolean):
		{pos: Position, way: number, sec: number}[] {
	let corners: Vector[] = [];
	corners[0] = new Vector(G.DefenseWidthHalf + extraDistance, G.FieldHeightHalf);
	corners[1] = new Vector(G.DefenseWidthHalf, G.FieldHeightHalf - G.DefenseHeight - extraDistance);
	corners[2] = new Vector(-G.DefenseWidthHalf - extraDistance, G.FieldHeightHalf - G.DefenseHeight);
	let directions: Vector[] = [];
	directions[0] = new Vector(0,-1);
	directions[1] = new Vector(-1,0);
	directions[2] = new Vector(0,1);

	let f = friendly ? -1 : 1;
	let way = 0;
	let intersections: {pos: Position, way: number, sec: number}[] = [];
	for (let i = 0;i < corners.length;i++) {
		let v = corners[i];
		// intersections on lines
		let length = (i % 2 === 1) ? G.DefenseWidth : G.DefenseHeight;
		let [ipos, l1, l2] = geom.intersectLineLine(pos, dir, v * f, directions[i] * f);
		vis.addPath("1Test", [pos, pos + dir], vis.colors.green);
		if (l1 && l1 >= 0 && l2 >= 0 && l2 <= length) {
			// no intersections with parallel lines
			if (!(l1 === 0 && l2 === 0) || ipos.distanceToSq(v * f) < 0.0001) {
				intersections.push({pos: ipos, way: way + l2, sec: i * 2 - 1});
			}
		}
		way = way + length;
		// intersections with arc segments
		if (i < 1 && extraDistance > 0) {
			let corner = new Vector((3 - (i + 1) * 2) * G.DefenseWidthHalf, G.FieldHeightHalf - G.DefenseHeight) * f;
			let oppRotation = friendly ? 0 : Math.PI;
			let circleIntersections = intersectRayArc(pos, dir, corner, extraDistance,
				Math.PI - (i + 1) * 0.5 * Math.PI + oppRotation, 1.5 * Math.PI - (i + 1) * 0.5 * Math.PI + oppRotation);
			for (let intersection of circleIntersections) {
				intersections.push({pos: intersection[0], way: way + (Math.PI / 2 - intersection[1]) * extraDistance, sec: (i + 1) * 2});
			}
		}
		way = way + Math.PI * extraDistance / 2;
		if (intersections.length === 2) {
			break;
		}
	}
	return intersections;
}

function intersectDefenseArea_2018(pos: Position, dir: RelativePosition, extraDistance: number, friendly: boolean):
		[Position, number, number] | [] {
	let intersections = intersectionsRayDefenseArea_2018(pos, dir, extraDistance, friendly);
	if (intersections[1] && pos.distanceToSq(intersections[0].pos) > pos.distanceToSq(intersections[1].pos)) {
		return [intersections[1].pos, intersections[1].way, intersections[1].sec];
	} else if (intersections[0]) {
		return [intersections[0].pos, intersections[0].way, intersections[0].sec];
	}
	return [];
}

// if the way is <0 or greater than the maximum way, the intersection is on
// the extended defense area side lines
function defenseIntersectionByWay_2018(way: number, extraDistance: number, friendly: boolean): Position | undefined {
	let corners: Vector[] = [];
	corners[0] = new Vector(G.DefenseWidthHalf + extraDistance, G.FieldHeightHalf);
	corners[1] = new Vector(G.DefenseWidthHalf, G.FieldHeightHalf - G.DefenseHeight - extraDistance);
	corners[2] = new Vector(-G.DefenseWidthHalf - extraDistance, G.FieldHeightHalf - G.DefenseHeight);
	let directions: Vector[] = [];
	directions[0] = new Vector(0,-1);
	directions[1] = new Vector(-1,0);
	directions[2] = new Vector(0,1);
	let f = friendly ? -1 : 1;

	for (let i = 0;i < 3;i++) {
		let v = corners[i];
		let length = (i % 2 === 1) ? G.DefenseWidth : G.DefenseHeight;
		if (way <= length || i === 1) {
			return (v + directions[i] * way) * f;
		}
		way = way - length - Math.PI / 2 * extraDistance;
		if (way < 0) {
			let corner = new Vector((3 - (i + 1) * 2) * G.DefenseWidthHalf, G.FieldHeightHalf - G.DefenseHeight) * f;
			let dir = Vector.fromAngle(-Math.PI / 2 * (i + 1) - way / extraDistance) * f;
			return corner + dir * extraDistance;
		}
	}
	return undefined;
}

function intersectionsRayDefenseArea_2017(pos: Position, dir: RelativePosition, extraDistance: number = 0,
		friendly: boolean = false): [{pos: Position, l1: number}[], number] {
	// calculate defense radius
	let radius = G.DefenseRadius + extraDistance;
	if (radius < 0) {
		throw new Error("extraDistance must not be smaller than -G.DefenseRadius");
	}

	// calculate length of defense border (arc - line - arc)
	let arcway = radius * Math.PI / 2;
	let lineway = G.DefenseStretch;
	let totalway = 2 * arcway + lineway;

	// calculate global positions
	let oppfac = friendly ? 1 : -1;
	let leftCenter = new Vector(-G.DefenseStretchHalf, -G.FieldHeightHalf) * oppfac;
	let rightCenter = new Vector(G.DefenseStretchHalf, -G.FieldHeightHalf) * oppfac;

	// calclulate global angles
	let oppadd = friendly ? 0 : Math.PI;
	let to_opponent = normalize(oppadd + Math.PI / 2);
	let to_friendly = normalize(oppadd - Math.PI / 2);

	// calculate intersection points with defense arcs
	let intersections: {pos: Vector, l1: number}[] = [];
	let ileft = intersectRayArc(pos, dir, leftCenter, radius, to_opponent, to_friendly);
	for (let i of ileft) {
		intersections.push({pos: i[0], l1: (Math.PI / 2 - i[1]) * radius});
	}
	let iright = intersectRayArc(pos, dir, rightCenter, radius, to_friendly, to_opponent);
	for (let i of iright) {
		intersections.push({pos: i[0], l1: (Math.PI - i[1]) * radius + arcway + lineway});
	}

	// calculate intersection point with defense stretch
	let defenseLineOnpoint = new Vector(0, -G.FieldHeightHalf + radius) * oppfac;
	let [lineIntersection,l1,l2] = geom.intersectLineLine(pos, dir, defenseLineOnpoint, new Vector(1,0));
	if (lineIntersection && l1 >= 0 && Math.abs(l2) <= G.DefenseStretchHalf) {
		intersections.push({pos: lineIntersection, l1: l2 + totalway / 2});
	}
	return [intersections, totalway];
}

function intersectionsRayDefenseArea_2017Wrapper(pos: Position, dir: RelativePosition, extraDistance: number = 0,
		friendly: boolean = false): {pos: Position, l1: number}[] {
	return intersectionsRayDefenseArea_2017(pos, dir, extraDistance, friendly)[0];
}

function intersectRayDefenseArea_2017(pos: Position, dir: RelativePosition, extraDistance: number, friendly: boolean):
		[Position | undefined, number] {
	let [intersections, totalway] = intersectionsRayDefenseArea_2017(pos, dir, extraDistance, friendly);

	// choose nearest intersection
	let minDistance = Infinity;
	let minIntersection = undefined;
	let minWay = totalway / 2;
	for (let i of intersections) {
		let dist = pos.distanceTo(i.pos);
		if (dist < minDistance) {
			minDistance = dist;
			minIntersection = i.pos;
			minWay = i.l1;
		}
	}
	return [minIntersection, minWay];
}

// FIXME: Calling intercetRayDefenseArea twice is bad because of floats: Sometimes there is still an intersection (because the result ist marginally outside the Defense area)
// Or there is no intersecton (because the result is marginally inside the Defense area). To avoid this problem, one has to use a slightly larger radius in the first call.

/// Returns one intersection of a given line with the (extended) defense area
/// The intersection is the one with the smallest t in x = pos + t * dir, t >= 0
// @name intersectRayDefenseArea
// @param pos Vector - starting point of the line
// @param dir Vector - the direction of the line
// @param extraDistance number - gets added to G.DefenseRadius
// @param opp bool - whether the opponent or the friendly defense area is considered
// @return Vector - the intersection position (May also be behind the goalline)
// @return number - the length of the way from the very left of the defense area to the
// @return number - sector in which the intersection lies, left to right
// 	the sectors are ordered as followes:
// 2  3  4
// 1     5
export let intersectRayDefenseArea: (pos: Position, dir: RelativePosition, extraDist: number, friendly: boolean) => [Position | undefined, number, number?] | [];
export let intersectionsRayDefenseArea: (pos: Position, dir: RelativePosition, extraDist: number, friendly: boolean) => IntersectionsType[];
if (World.RULEVERSION === "2018") {
	intersectRayDefenseArea = intersectDefenseArea_2018;
	intersectionsRayDefenseArea = intersectionsRayDefenseArea_2018;
} else {
	intersectRayDefenseArea = intersectRayDefenseArea_2017;
	intersectionsRayDefenseArea = intersectionsRayDefenseArea_2017Wrapper;
}

function cornerPointsBetweenWays2018(way1: number, way2: number, radius: number = 0, friendly: boolean): Position[] {
	let smallerWay = Math.min(way1, way2);
	let largerWay = Math.max(way1, way2);
	let cornerLeftWay = G.DefenseHeight + Math.PI * radius / 4;
	let cornerRightWay = G.DefenseHeight + G.DefenseWidth + 3 * Math.PI * radius / 4;
	let result: Position[] = [];
	if (smallerWay <= cornerLeftWay && largerWay >= cornerLeftWay) {
		let cornerLeft = new Vector(-G.DefenseWidthHalf, -G.FieldHeightHalf + G.DefenseHeight) + new Vector(-1, 1).setLength(radius);
		if (!friendly) {
			cornerLeft = -cornerLeft;
		}
		result.push(cornerLeft);
	}
	if (smallerWay <= cornerRightWay && largerWay >= cornerRightWay) {
		let cornerRight = new Vector(G.DefenseWidthHalf, -G.FieldHeightHalf + G.DefenseHeight) + new Vector(1, 1).setLength(radius);
		if (!friendly) {
			cornerRight = -cornerRight;
		}
		result.push(cornerRight);
	}
	if (result.length === 2 && way1 > way2) {
		let temp = result[1];
		result[1] = result[2];
		result[2] = temp;
	}
	return result;
}

function cornerPointsBetweenWays2017() {
	return [];
}

// return a list of all cornerpoints between the given ways
// note that the radius has to be the same as with which the ways were calculated
// the resulting points are ordered in the same way as the in put ways
// @name cornerPointsBetweenWays
// @param way1 number - the first way, doesn't have to be the lower one
// @param way2 number - the second way
// @param radius number - the radius of the defense area to be considered
// @param friendly bool - whether to use the friendly or the opponent defense area
// @return table - list of all corner points between the two ways
// 					the resulting points are radius away from the defense area
export let cornerPointsBetweenWays: (way1: number, way2: number, radius: number, friendly: boolean) => Position[];
if (World.RULEVERSION === "2018") {
	cornerPointsBetweenWays = cornerPointsBetweenWays2018;
} else {
	cornerPointsBetweenWays = cornerPointsBetweenWays2017;
}


function maxWay2018(radius: number): number {
	return G.DefenseHeight * 2 + G.DefenseWidth + Math.PI * radius;
}

function maxWay2017(radius: number): number {
	return G.DefenseStretch + Math.PI * (radius + G.DefenseRadius);
}

// return the maximum way that can be reached on the defense area with a given radius
// @name maxWay
// @param radius number - the radius for the defense area
// @return number - the maximum way
export let maxWay: (radius: number) => number;
if (World.RULEVERSION === "2018") {
	maxWay = maxWay2018;
} else {
	maxWay = maxWay2017;
}

/// Return all line segments of the line segment pos to pos + dir * maxLength which are in the allowed field part
// @name allowedLineSegments
// @param pos Vector - starting point of the line
// @param dir Vector - the direction of the line
// @param maxLength number - length of the line segment, optional
// @return table - contains n {pos1, pos2} tables representing the resulting line segments
export function allowedLineSegments(pos: Position, dir: RelativePosition, maxLength: number = Infinity): [Position, Position][] {
	let direction = dir.copy();
	direction.setLength(1);
	let [pos1, lambda1] = geom.intersectLineLine(pos, direction, new Vector(G.FieldWidthHalf, 0), new Vector(0, 1));
	let [pos2, lambda2] = geom.intersectLineLine(pos, direction, new Vector(-G.FieldWidthHalf, 0), new Vector(0, 1));
	let [pos3, lambda3] = geom.intersectLineLine(pos, direction, new Vector(0, G.FieldHeightHalf), new Vector(1, 0));
	let [pos4, lambda4] = geom.intersectLineLine(pos, direction, new Vector(0, -G.FieldHeightHalf), new Vector(1, 0));
	let lambdas: number[] = [];
	let fieldLambdas = [lambda1, lambda2, lambda3, lambda4];
	let fieldPos = [pos1, pos2, pos3, pos4];
	for (let i = 0;i < fieldLambdas.length;i++) {
		let lambda = fieldLambdas[i];
		if (lambda > maxLength) {
			lambda = maxLength;
		}
		// an offset 0f 0.05 is used here and below as the calculated point is on
		// the border of the field anyways, otherwise it might flicker due to floating
		// point inaccuracies
		if (isInField(fieldPos[i], 0.05) && lambda > 0) {
			lambdas.push(lambda);
		}
	}

	let intersectionsOwn = intersectionsRayDefenseArea(pos, direction, 0, true);
	let intersectionsOpp = intersectionsRayDefenseArea(pos, direction, 0, false);
	intersectionsOwn = intersectionsOwn.concat(intersectionsOpp);
	for (let intersection of intersectionsOwn) {
		let lambda = pos.distanceTo(intersection.pos);
		if (lambda > maxLength) {
			lambda = maxLength;
		}
		if (isInField(intersection.pos, 0.05) && lambda > 0) {
			lambdas.push(lambda);
		}
	}

	if (isInAllowedField(pos, 0)) {
		lambdas.push(0);
	}

	lambdas.sort();

	let result: [Position, Position][] = [];
	for (let i = 0;i < Math.floor(lambdas.length / 2);i++) {
		let p1 = pos + direction * lambdas[i * 2];
		let p2 = pos + direction * lambdas[i * 2 + 1];
		if (p1.distanceTo(p2) > 0) {
			result.push([p1, p2]);
		}
	}
	return result;
}

/// Calculates the point on the (extended) defense area when given the way along its border
// @name defenseIntersectionByWay
// @param way number - the way along the border
// @param extraDistance number - gets added to G.DefenseRadius
// @param friendly bool - whether the opponent or the friendly defense area is considered
// @return Vector - the position
function defenseIntersectionByWay_2017(way: number, extraDistance: number = 0, friendly: boolean): Position {
	// calculate defense radius
	let radius = G.DefenseRadius + extraDistance;
	if (radius < 0) {
		throw new Error(`extraDistance must not be smaller thhan -G.DefenseRadius: ${extraDistance}`);
	}

	// calculate length of defense border (arc - line - arc)
	let arcway = radius * Math.PI / 2;
	let lineway = G.DefenseStretch;
	let totalway = 2 * arcway + lineway;

	// bind way to [0, totalway] by mirroring it
	// inserted way can be in [-2*totalway, 2*totalway]
	if (way < 0) {
		way = -way;
	}
	if (way > totalway) {
		way = 2 * totalway - way; // if abs(way) > 2*totalway, way will be negative and be eaten by the folling assert
	}

	if (way < 0) {
		throw new Error(`way is out of bounds (${way}, ${extraDistance}, ${friendly})`);
	}

	let intersection;
	if (way < arcway) {
		let angle = way / radius;
		intersection = Vector.fromAngle(- angle) * radius +
			new Vector(G.DefenseStretchHalf, G.FieldHeightHalf);
	} else if (way <= arcway + lineway) {
		intersection = new Vector(-way + arcway + G.DefenseStretchHalf, G.FieldHeightHalf - radius);
	} else {
		let angle = (way - arcway - lineway) / radius;
		intersection = Vector.fromAngle(- Math.PI / 2 - angle) * radius +
			new Vector(-G.DefenseStretchHalf, G.FieldHeightHalf);
	}

	if (friendly) {
		intersection = -intersection;
	}

	return intersection;
}

export let defenseIntersectionByWay: (way: number, extraDistance: number, friendly: boolean) => Position | undefined;
if (World.RULEVERSION === "2018") {
	defenseIntersectionByWay = defenseIntersectionByWay_2018;
} else {
	defenseIntersectionByWay = defenseIntersectionByWay_2017;
}

/// Calculates all intersections (0 to 4) of a given circle with the (extended) defense area
// @name intersectCircleDefenseArea
// @param pos Vector - center point of the circle
// @param radius number - radius of the circle
// @param extraDistance number - gets added to G.DefenseRadius
// @param friendly bool - whether the opponent or the friendly defense area is considered
// @return [Vector] - a list of intersection points, not sorted
function intersectCircleDefenseArea_2017(pos: Position, radius: number, extraDistance: number, friendly: boolean): Position[] {
	// invert coordinates if opp-flag is set
	if (friendly) {
		pos = pos * -1;
	}

	let leftCenter = new Vector(-G.DefenseStretchHalf, G.FieldHeightHalf);
	let rightCenter = new Vector(G.DefenseStretchHalf, G.FieldHeightHalf);
	let defenseRadius = G.DefenseRadius + extraDistance;

	let intersections: Position[] = [];

	// get intersections with circles
	let [li1, li2] = geom.intersectCircleCircle(leftCenter, defenseRadius, pos, radius);
	let [ri1, ri2] = geom.intersectCircleCircle(rightCenter, defenseRadius, pos, radius);
	if (li1 && li1.x < G.DefenseStretchHalf && li1.y < G.FieldHeightHalf) {
		intersections.push(li1);
	}
	if (li2 &&  li2.x < G.DefenseStretchHalf && li2.y < G.FieldHeightHalf) {
		intersections.push(li2);
	}
	if (ri1 && ri1.x > G.DefenseStretchHalf && ri1.y < G.FieldHeightHalf) {
		intersections.push(ri1);
	}
	if (ri2 && ri2.x > G.DefenseStretchHalf && ri2.y < G.FieldHeightHalf) {
		intersections.push(ri2);
	}

	// get intersections with line
	let [mi1, mi2] = geom.intersectLineCircle(
				new Vector(0, G.FieldHeightHalf - defenseRadius), new Vector(1, 0), pos, radius);
	if (mi1 && Math.abs(mi1.x) <= G.DefenseStretchHalf) {
		intersections.push(mi1);
	}
	if (mi2 && Math.abs(mi1.x) <= G.DefenseStretchHalf) {
		intersections.push(mi2);
	}


	// invert coordinates if opp-flag is set
	if (friendly) {
		for (let i = 0;i < intersections.length;i++) {
			intersections[i] = intersections[i] * -1;
		}
	}

	return intersections;
}

function intersectCircleDefenseArea_2018(pos: Position, radius: number, extraDistance: number, friendly: boolean): Position[] {
	if (!isInDefenseArea_2018(pos, radius + extraDistance, friendly)) {
		return [];
	}
	let corners: Position[] = [];
	corners[0] = new Vector(G.DefenseWidthHalf, G.FieldHeightHalf);
	corners[1] = new Vector(G.DefenseWidthHalf, G.FieldHeightHalf - G.DefenseHeight);
	corners[2] = new Vector(-G.DefenseWidthHalf, G.FieldHeightHalf - G.DefenseHeight);
	corners[3] = new Vector(-G.DefenseWidthHalf, G.FieldHeightHalf);
	corners[4] = new Vector(corners[0].x + extraDistance, corners[0].y);
	corners[5] = new Vector(corners[1].x, corners[1].y - extraDistance);
	corners[6] = new Vector(corners[2].x - extraDistance, corners[2].y);
	corners[7] = new Vector(corners[3].x, corners[3].y + extraDistance);
	// invert coordinates if friendly-flag is set
	if (friendly) {
		pos = pos * -1;
	}

	let intersections: Position[] = [];

	let ci1, ci2;
	let zero = new Vector(0, 0);
	let li1, li2, lambda1, lambda2;
	let dirPrev = corners[0] - corners[3];
	for (let i = 0; i < 3;i++) {
		let dir = corners[i + 1] - corners[i];
		// get intersections with circles
		if (i > 0 && i < 2) {
			[ci1, ci2] = geom.intersectCircleCircle(zero, extraDistance, pos - corners[i], radius);
			if (ci1 && insideSector([dirPrev, -dir], ci1)) {
				intersections.push(ci1 + corners[i]);
			}
			if (ci2 && insideSector([dirPrev, -dir], ci2)) {
				intersections.push(ci2 + corners[i]);
			}
		}
		dirPrev = dir;
		// get intersections with line
		[li1, li2, lambda1, lambda2] = geom.intersectLineCircle(corners[i + 4], dir, pos, radius);
		if (lambda1 != undefined && lambda1 >= 0 && lambda1 * lambda1 < dir.lengthSq()) {
			intersections.push(li1);
		}
		if (lambda2 != undefined && li2 != undefined && lambda2 >= 0 && lambda2 * lambda2 < dir.lengthSq()) {
			intersections.push(li2);
		}
	}
	// invert coordinates if opp-flag is set
	if (friendly) {
		for (let i = 0; i < intersections.length;i++) {
			intersections[i] = intersections[i] * -1;
		}
	}

	return intersections;
}

export let intersectCircleDefenseArea: (pos: Position, radius: number, extraDistance: number, friendly: boolean) => Position[];
if (World.RULEVERSION === "2018") {
	intersectCircleDefenseArea = intersectCircleDefenseArea_2018;
} else {
	intersectCircleDefenseArea = intersectCircleDefenseArea_2017;
}

/// Calculates the distance (between robot hull and field line) to the own goal line
// @name distanceToFriendlyGoalLine
// @param pos Vector - the position to check
// @param radius number - Radius of object to check
// @return number - distance
export function distanceToFriendlyGoalLine(pos: Position, radius: number): number {
	if (Math.abs(pos.x) < G.GoalWidth / 2) {
		return Math.max(G.FieldHeightHalf + pos.y - radius, 0);
	}
	let goalpost = new Vector(pos.x > 0 ? G.GoalWidth / 2 : - G.GoalWidth / 2, -G.FieldHeightHalf);
	return goalpost.distanceTo(pos) - radius;
}

/// Check whether to position is in the teams own corner
// @name isInOwnCorner
// @param pos Vector - the position to check
// @param opp bool - Do the check from the opponents point of view
// @return bool
export function isInOwnCorner(pos: Position, opp: boolean): boolean {
	let oppfac = opp ? 1 : -1;
	let a = (G.FieldWidthHalf - Math.abs(pos.x));
	let b = (oppfac * G.FieldHeightHalf - pos.y);
	return a * a + b * b < 1;
}

/// The position, where the half-line given by startPos and dir intersects the next field boundary
// @param startPos vector - the initial point of the half-line
// @param dir vector - the direction of the half-line
// @param [offset number - additional offset to move field lines further outwards]
// @return [vector]
export function nextLineCut(startPos: Position, dir: RelativePosition, offset: number = 0): Position | undefined {
	if (dir.x === 0 && dir.y === 0) {
		return undefined;
	}
	let width = new Vector((dir.x > 0 ? 1 : -1) * (G.FieldWidthHalf + offset), 0);
	let height = new Vector(0, (dir.y > 0 ? 1 : -1) * (G.FieldHeightHalf + offset));
	let [sideCut, sideLambda] = geom.intersectLineLine(startPos, dir, width, height);
	let [frontCut, frontLambda] = geom.intersectLineLine(startPos, dir, height, width);
	if (sideCut) {
		if (frontCut) {
			if (sideLambda < frontLambda) {
				return sideCut;
			} else {
				return frontCut;
			}
		} else {
			return sideCut;
		}
	} else {
		return frontCut;
	}
}


/// Calculates the next intersection with the field boundaries or the defense areas
// @name nextAllowedFieldLineCut
// @param startPos vector - the initial point of the half-line
// @param dir vector - the direction of the half-line
// @param extraDistance number - the radius of the object (gets added to G.DefenseRadius)
// @return Vector - minLineCut
// @return Number - the lambda for the line cut
export function nextAllowedFieldLineCut(startPos: Position, dir: RelativePosition, extraDistance: number): [Position, number] | [] {
	let normalizedDir = dir.copy().normalize();
	let perpendicularDir = normalizedDir.perpendicular();

	let boundaryLineCut = nextLineCut(startPos, normalizedDir, -extraDistance);
	let [friendlyDefenseLineCut] = intersectRayDefenseArea(startPos, normalizedDir, extraDistance, false);
	let [opponentDefenseLineCut] = intersectRayDefenseArea(startPos, normalizedDir, extraDistance, true);

	let lineCuts: Position[] = [];
	if (boundaryLineCut != undefined) {
		lineCuts.push(boundaryLineCut);
	}
	if (friendlyDefenseLineCut != undefined) {
		lineCuts.push(friendlyDefenseLineCut);
	}
	if (opponentDefenseLineCut != undefined) {
		lineCuts.push(opponentDefenseLineCut);
	}

	let minLambda = Infinity;
	let minLineCut: Position | undefined = undefined;
	for (let lineCut of lineCuts) {
		let [_, lambda] = geom.intersectLineLine(startPos, normalizedDir, lineCut, perpendicularDir);
		if (lambda != undefined && lambda > 0 && lambda < minLambda) {
			minLambda = lambda;
			minLineCut = lineCut;
		}
	}

	if (minLineCut == undefined) {
		return [];
	}
	return [minLineCut, minLambda];
}

// Checks wether a position lies inside the friendly goal
// @name isInFriendlyGoal
// @param pos vector - the position to check
// @return bool - is in friendly goal
export function isInFriendlyGoal(pos: Position): boolean {
	return geom.insideRect(
		G.FriendlyGoalLeft - new Vector(0, G.GoalDepth),
		G.FriendlyGoalRight,
		pos
	);
}

// Checks wether a position lies inside the opponent goal
// @name isInOpponentGoal
// @param pos vector - the position to check
// @return bool - is in friendly goal
export function isInOpponentGoal(pos: Position): boolean {
	return geom.insideRect(
		G.OpponentGoalRight + new Vector(0, G.GoalDepth),
		G.OpponentGoalLeft,
		pos
	);
}


function defenseBaselineIntersectionDistance_2017(): number {
	return World.Geometry.DefenseRadius + (World.Geometry.DefenseStretch / 2);
}

function defenseBaselineIntersectionDistance_2018(): number {
	return World.Geometry.DefenseWidth / 2;
}

export let defenseBaselineIntersectionDistance: () => number;
if (World.RULEVERSION === "2018") {
	defenseBaselineIntersectionDistance = defenseBaselineIntersectionDistance_2018;
} else {
	defenseBaselineIntersectionDistance = defenseBaselineIntersectionDistance_2017;
}
