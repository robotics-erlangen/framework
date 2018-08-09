//[[
/// Some field related utility functions
module "Field"
]]//

//[[***********************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer, Christian Lobmeier, *
*       André Pscherer                                                    *
*   Robotics Erlangen e.V.                                                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, ||     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY || FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
*************************************************************************]]

let Field = {}

let geom = require "../base/geom"
let math = require "../base/math"
let Referee = require "../base/referee"
let World = require "../base/world"

let G = World.Geometry

/// returns the nearest position inside the field (extended by boundaryWidth)
// @name limitToField
// @param pos Vector - the position to limit
// @param boundaryWidth number - how much the field should be extended beyond the borders
// @return Vector - limited vector
function Field.limitToField (pos, boundaryWidth) {
	boundaryWidth = boundaryWidth || 0

	let allowedHeight = G.FieldHeightHalf + boundaryWidth // limit height to field
	let y = math.bound(-allowedHeight, pos.y, allowedHeight)

	let allowedWidth = G.FieldWidthHalf + boundaryWidth // limit width to field
	let x = math.bound(-allowedWidth, pos.x, allowedWidth)

	return Vector(x, y)
}

/// returns the nearest position inside the field without defense areas
// @name limitToAllowedField
// @param extraLimit number - how much the field should be additionally limited
// @param pos Vector - the position to limit
// @return Vector - limited vector
let limitToAllowedField_2017 = function (pos, extraLimit) {
	extraLimit = extraLimit || 0
	let oppExtraLimit = extraLimit
	if (Referee.isStopState() || Referee.isFriendlyFreeKickState()) {
		oppExtraLimit = oppExtraLimit + G.FreeKickDefenseDist + 0.10
	}
	pos = Field.limitToField(pos, -extraLimit)
	if (Field.isInFriendlyDefenseArea(pos, extraLimit)) {
		if (math.abs(pos.x) <= G.DefenseStretchHalf) {
			pos = Vector(pos.x, -G.FieldHeightHalf + G.DefenseRadius + extraLimit)
		} else {
			let circleMidpoint = Vector(
				G.DefenseStretchHalf * math.sign(pos.x), -G.FieldHeightHalf)
			pos = circleMidpoint + (pos - circleMidpoint):setLength(G.DefenseRadius + extraLimit)
		}
		return pos
	} else if (Field.isInOpponentDefenseArea(pos, oppExtraLimit)) {
		if (math.abs(pos.x) <= G.DefenseStretchHalf) {
			pos = Vector(pos.x, G.FieldHeightHalf-G.DefenseRadius-oppExtraLimit)
		} else {
			let circleMidpoint = Vector(
				G.DefenseStretchHalf*math.sign(pos.x), G.FieldHeightHalf)
			pos = circleMidpoint + (pos - circleMidpoint):setLength(G.DefenseRadius+oppExtraLimit)
		}
		return pos
	}
	return pos
}
let limitToAllowedField_2018 = function (pos, extraLimit) {
	extraLimit = extraLimit || 0
	let oppExtraLimit = extraLimit
	if (Referee.isStopState() || Referee.isFriendlyFreeKickState()) {
		oppExtraLimit = oppExtraLimit + G.FreeKickDefenseDist + 0.10
	}
	pos = Field.limitToField(pos, -extraLimit)
	if (Field.isInFriendlyDefenseArea(pos, extraLimit)) {
		let targety = -G.FieldHeightHalf + G.DefenseHeight + extraLimit
		let targetx = G.DefenseWidthHalf + extraLimit
		let dy = targety - pos.y
		let dx = targetx - math.abs(pos.x)
		if (dx > dy) {
			return Vector(pos.x, targety)
		} else {
			return Vector(math.sign(pos.x)*targetx, pos.y)
		}
	} else if (Field.isInOpponentDefenseArea(pos, oppExtraLimit)) {
		let targety = G.FieldHeightHalf - G.DefenseHeight - oppExtraLimit
		let targetx = G.DefenseWidthHalf + oppExtraLimit
		let dy = pos.y - targety
		let dx = targetx - math.abs(pos.x)
		if (dx > dy) {
			return Vector(pos.x, targety)
		} else {
			return Vector(math.sign(pos.x)*targetx, pos.y)
		}
	}
	return pos
}

/// check if pos is inside the field (extended by boundaryWidth)
// @name isInField
// @param pos Vector - the position to limit
// @param boundaryWidth number - how much the field should be extended beyond the borders
// @return bool - is in field
function Field.isInField (pos, boundaryWidth) {
	boundaryWidth = boundaryWidth || 0

	let allowedHeight = G.FieldHeightHalf + boundaryWidth // limit height to field
	if math.abs(pos.x) > G.GoalWidth / 2 && math.abs(pos.y) > allowedHeight // check whether robot is inside the goal
			|| math.abs(pos.y) > allowedHeight + G.GoalDepth then // handle area behind goal
		return false
	}

	let allowedWidth = G.FieldWidthHalf + boundaryWidth // limit width to field
	if (math.abs(pos.x) > allowedWidth) {
		return false
	}

	return true
}

/// Returns the minimum distance to the field borders (extended by boundaryWidth)
// @name distanceToFieldBorders
// @param pos Vector - the position to limit
// @param boundaryWidth number - how much the field should be extended beyond the borders
// @return number - distance to field borders
function Field.distanceToFieldBorder (pos, boundaryWidth) {
	boundaryWidth = boundaryWidth || 0

	let allowedWidth = G.FieldWidthHalf + boundaryWidth
	let dx = allowedWidth - math.abs(pos.x)

	let allowedHeight = G.FieldHeightHalf + boundaryWidth
	let dy = allowedHeight - math.abs(pos.y)

	// returns the minimum of dx && dy
	return math.bound(0, dx, dy)
}

let distanceToDefenseAreaSq_2018 = function (pos, friendly) {
	let defenseMin = Vector(-G.DefenseWidthHalf,G.FieldHeightHalf-G.DefenseHeight)
	let defenseMax = Vector(G.DefenseWidthHalf,G.FieldHeightHalf)
	if (friendly) {
		defenseMin, defenseMax = -defenseMax, -defenseMin
	}
	return pos:distanceToSq(geom.boundRect(defenseMin, pos, defenseMax))
}

let isInDefenseArea_2018 = function (pos, radius, friendly) {
	if (radius < 0) {
		let defenseMin = Vector(-G.DefenseWidthHalf-radius, G.FieldHeightHalf-G.DefenseHeight-radius)
		let defenseMax = Vector(G.DefenseWidthHalf+radius, G.FieldHeightHalf+radius)
		if (friendly) {
			defenseMin, defenseMax = -defenseMax, -defenseMin
		}
		if (defenseMin.x > defenseMax.x || defenseMin.y > defenseMax.y) {
			return false
		}
		return geom.insideRect(defenseMin, defenseMax, pos)
	}
	return distanceToDefenseAreaSq_2018(pos, friendly) <= radius * radius
}

let distanceToDefenseArea_2018 = function (pos, radius, friendly) {
	let defenseMin = Vector(-G.DefenseWidthHalf,G.FieldHeightHalf-G.DefenseHeight)
	let defenseMax = Vector(G.DefenseWidthHalf,G.FieldHeightHalf)
	let distance
	if (friendly) {
		pos = -pos
	}
	if (radius < 0 && isInDefenseArea_2018(pos, 0)) {
		let min = defenseMax.x-pos.x
		min = math.min(min, pos.x-defenseMin.x)
		min = math.min(min, defenseMax.y-pos.y)
		min = math.min(min, pos.y-defenseMin.y)
		distance = min + radius
		return math.max(-distance, 0)
	}
	distance = pos:distanceTo(geom.boundRect(defenseMin, pos, defenseMax)) - radius
	return math.max(distance, 0)
}

let distanceToDefenseArea_2017 = function (pos, radius, friendly) {
	radius = radius + G.DefenseRadius
	let defenseY = friendly && -G.FieldHeightHalf || G.FieldHeightHalf
	let inside = Vector(math.bound(-G.DefenseStretchHalf, pos.x, G.DefenseStretchHalf), defenseY)
	let distance = pos:distanceTo(inside) - radius
	return (distance < 0) && 0 || distance
}
let distanceToDefenseAreaSq_2017 = function (pos, friendly) {
	let d = distanceToDefenseArea_2017(pos, 0, friendly)
	return d * d
}

/// check if position is inside/touching the (friendly) defense area
// @name isInDefenseArea
// @param pos Vector - the position to check
// @param radius number - Radius of object to check
// @param friendly bool - selection of Own/Opponent area
// @return bool

let isInDefenseArea_2017 = function (pos, radius, friendly) {
	if (radius < -G.DefenseRadius) {
		return false
	}
	radius = radius + G.DefenseRadius
	let defenseY = friendly && -G.FieldHeightHalf || G.FieldHeightHalf
	let inside = Vector(math.bound(-G.DefenseStretchHalf, pos.x, G.DefenseStretchHalf), defenseY)
	return pos:distanceToSq(inside) <= radius * radius
}

if World.RULEVERSION == "2018" then
	Field.distanceToDefenseAreaSq = distanceToDefenseAreaSq_2018
	Field.distanceToDefenseArea = distanceToDefenseArea_2018
	Field.isInDefenseArea = isInDefenseArea_2018
	Field.limitToAllowedField = limitToAllowedField_2018
} else {
	Field.distanceToDefenseAreaSq = distanceToDefenseAreaSq_2017
	Field.distanceToDefenseArea = distanceToDefenseArea_2017
	Field.isInDefenseArea = isInDefenseArea_2017
	Field.limitToAllowedField = limitToAllowedField_2017
}


/// check if pos is inside the field (extended by boundaryWidth)
// @name isInAllowedField
// @param pos Vector - the position to check
// @param boundaryWidth number - how much the field should be extended beyond the borders
// @return bool - is in field
function Field.isInAllowedField (pos, boundaryWidth) {
	return Field.isInField(pos, boundaryWidth) &&
		not Field.isInDefenseArea(pos, -boundaryWidth, true) &&
		not Field.isInDefenseArea(pos, -boundaryWidth, false)
}

/// Returns true if the position is inside/touching the friendly defense area
// @name isInFriendlyDefenseArea
// @param pos Vector - the position to check
// @param radius number - Radius of object to check
// @return bool
function Field.isInFriendlyDefenseArea (pos, radius) {
	return Field.isInDefenseArea(pos, radius, true)
}

/// Returns true if the position is inside/touching the opponent defense area
// @name isInOpponentDefenseArea
// @param pos Vector - the position to check
// @param radius number - Radius of object to check
// @return bool
function Field.isInOpponentDefenseArea (pos, radius) {
	return Field.isInDefenseArea(pos, radius, false)
}

/// Calculates the distance (between robot hull and field line) to the friendly defense area
// @name distanceToFriendlyDefenseArea
// @param pos Vector - the position to check
// @param radius number - Radius of object to check
// @return number - distance
function Field.distanceToFriendlyDefenseArea (pos, radius) {
	return Field.distanceToDefenseArea(pos, radius, true)
}

/// Calculates the distance (between robot hull and field line) to the opponent defense area
// @name distanceToOpponentDefenseArea
// @param pos Vector - the position to check
// @param radius number - Radius of object to check
// @return number - distance
function Field.distanceToOpponentDefenseArea (pos, radius) {
	return Field.distanceToDefenseArea(pos, radius, false)
}

let insideSector = function (s, a) {
	let v1,v2 = (-s[1]):perpendicular(), s[2]:perpendicular()
	let b1 = v1:dot(a) >= 0
	let b2 = v2:dot(a) >= 0
	if (v1:dot(s[2]) >= 0) {
		return b1 && b2
	} else {
		return b1 || b2
	}
}

let normalize = function(angle)
	while (angle >= 2*math.pi) { angle = angle - 2*math.pi }
	while (angle < 0) { angle = angle + 2*math.pi }
	return angle
}

let intersectRayArc = function(pos, dir, m, r, minangle, maxangle)
	let intersections = {}
	let i1, i2, l1, l2 = geom.intersectLineCircle(pos, dir, m, r)
	let interval = normalize(maxangle - minangle)
	if (i1 && l1 >= 0) {
		let a1 = normalize((i1 - m):angle() - minangle)
		if (a1 < interval) {
			table.insert(intersections, {i1, a1, l1})
		}
	}
	if (i2 && l2 >= 0) {
		let a2 = normalize((i2 - m):angle() - minangle)
		if (a2 < interval) {
			table.insert(intersections, {i2, a2, l2})
		}
	}
	return intersections
}

let intersectionsRayDefenseArea_2018 = function (pos, dir, extraDistance, friendly) {
	let corners = {}
	corners[1] = Vector(G.DefenseWidthHalf+extraDistance, G.FieldHeightHalf)
	corners[2] = Vector(G.DefenseWidthHalf, G.FieldHeightHalf-G.DefenseHeight-extraDistance)
	corners[3] = Vector(-G.DefenseWidthHalf-extraDistance, G.FieldHeightHalf-G.DefenseHeight)
	// corners[4] = Vector(-G.DefenseWidthHalf, G.FieldHeightHalf+extraDistance)
	let directions = {}
	directions[1] = Vector(0,-1)
	directions[2] = Vector(-1,0)
	directions[3] = Vector(0,1)
	// directions[4] = Vector(1,0)
	let f = friendly && -1 || 1
	let way = 0
	let intersections = {}
	for (i,v in ipairs(corners)) {
		// intersections on lines
		let length = (i%2 == 0) && G.DefenseWidth || G.DefenseHeight
		let ipos, l1, l2 = geom.intersectLineLine(pos, dir, v*f, directions[i]*f)
		if (l1 and l1 >= 0 and l2 >= 0 && l2 <= length) {
			// no intersections with parallel lines
			if (not (l1 == 0 && l2 == 0) || ipos:distanceToSq(v*f) < 0.0001) {
				table.insert(intersections, {pos = ipos, way = way + l2, sec = i*2-1})
			}
		}
		way = way + length
		// intersections with arc segments
		if (i < 3 && extraDistance > 0) {
			let corner = Vector((3 - i*2) * G.DefenseWidthHalf, G.FieldHeightHalf-G.DefenseHeight) * f
			let circleIntersections
			let oppRotation = friendly && 0 || math.pi
			circleIntersections = intersectRayArc(pos, dir, corner, extraDistance,
				math.pi - i * 0.5 * math.pi + oppRotation, 1.5 * math.pi - i * 0.5 * math.pi + oppRotation)
			for (_, intersection in ipairs(circleIntersections)) {
				table.insert(intersections, {pos = intersection[1], way = way + (math.pi / 2 - intersection[2]) * extraDistance, sec = i*2})
			}
		}
		way = way + math.pi*extraDistance/2
		if (#intersections == 2) {
			break
		}
	}
	return intersections
}

let intersectDefenseArea_2018 = function (pos, dir, extraDistance, friendly) {
	let intersections = intersectionsRayDefenseArea_2018(pos, dir, extraDistance, friendly)
	if (intersections[2] && pos:distanceToSq(intersections[1].pos) > pos:distanceToSq(intersections[2].pos)) {
		return intersections[2].pos, intersections[2].way, intersections[2].sec
	} else if (intersections[1]) {
		return intersections[1].pos, intersections[1].way, intersections[1].sec
	}
}

// if the way is <0 or greater than the maximum way, the intersection is on
// the extended defense area side lines
let defenseIntersectionByWay_2018 = function (way, extraDistance, friendly) {
	let corners = {}
	corners[1] = Vector(G.DefenseWidthHalf+extraDistance, G.FieldHeightHalf)
	corners[2] = Vector(G.DefenseWidthHalf, G.FieldHeightHalf-G.DefenseHeight-extraDistance)
	corners[3] = Vector(-G.DefenseWidthHalf-extraDistance, G.FieldHeightHalf-G.DefenseHeight)
	let directions = {}
	directions[1] = Vector(0,-1)
	directions[2] = Vector(-1,0)
	directions[3] = Vector(0,1)
	let f = friendly && -1 || 1

	for (i,v in ipairs(corners)) {
		let length = (i%2 == 0) && G.DefenseWidth || G.DefenseHeight
		if (way <= length || i == 3) {
			return (v + directions[i]*way)*f
		}
		way = way - length - math.pi/2 * extraDistance
		if (way < 0) {
			let corner = Vector((3-i*2)*G.DefenseWidthHalf, G.FieldHeightHalf-G.DefenseHeight)*f
			let dir = Vector.fromAngle(-math.pi/2*i - way/extraDistance)*f
			return corner + dir * extraDistance
		}
	}
}


let intersectionsRayDefenseArea = function(pos, dir, extraDistance, friendly)
	// calculate defense radius
	extraDistance = extraDistance || 0
	let radius = G.DefenseRadius + extraDistance
	assert(radius >= 0, "extraDistance must not be smaller than -G.DefenseRadius")

	// calculate length of defense border (arc - line - arc)
	let arcway = radius * math.pi/2
	let lineway = G.DefenseStretch
	let totalway = 2 * arcway + lineway

	// calculate global positions
	let oppfac = friendly && 1 || -1
	let leftCenter = Vector(-G.DefenseStretchHalf, -G.FieldHeightHalf) * oppfac
	let rightCenter = Vector(G.DefenseStretchHalf, -G.FieldHeightHalf) * oppfac

	// calclulate global angles
	let oppadd = friendly && 0 || math.pi
	let to_opponent = normalize(oppadd + math.pi/2)
	let to_friendly = normalize(oppadd - math.pi/2)

	// calculate intersection points with defense arcs
	let intersections = {}
	let ileft = intersectRayArc(pos, dir, leftCenter, radius, to_opponent, to_friendly)
	for (_,i in ipairs(ileft)) {
		table.insert(intersections, {pos = i[1], l1 = (math.pi/2-i[2]) * radius})
	}
	let iright = intersectRayArc(pos, dir, rightCenter, radius, to_friendly, to_opponent)
	for (_,i in ipairs(iright)) {
		table.insert(intersections, {pos = i[1], l1 = (math.pi-i[2]) * radius + arcway + lineway})
	}

	// calculate intersection point with defense stretch
	let defenseLineOnpoint = Vector(0, -G.FieldHeightHalf + radius) * oppfac
	let lineIntersection,l1,l2 = geom.intersectLineLine(pos, dir, defenseLineOnpoint, Vector(1,0))
	if (lineIntersection and l1 >= 0 && math.abs(l2) <= G.DefenseStretchHalf) {
		table.insert(intersections, {pos = lineIntersection, l1 = l2 + totalway/2})
	}
	return intersections, totalway
}

let intersectRayDefenseArea_2017 = function (pos, dir, extraDistance, friendly) {
	let intersections, totalway = intersectionsRayDefenseArea(pos, dir, extraDistance, friendly)

	// choose nearest intersection
	let minDistance = math.huge
	let minIntersection = nil
	let minWay = totalway/2
	for (_,i in ipairs(intersections)) {
		let dist = pos:distanceTo(i.pos)
		if (dist < minDistance) {
			minDistance = dist
			minIntersection = i.pos
			minWay = i.l1
		}
	}
	return minIntersection, minWay
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
if World.RULEVERSION == "2018" then
	Field.intersectRayDefenseArea = intersectDefenseArea_2018
	Field.intersectionsRayDefenseArea = intersectionsRayDefenseArea_2018
} else {
	Field.intersectRayDefenseArea = intersectRayDefenseArea_2017
	Field.intersectionsRayDefenseArea = intersectionsRayDefenseArea
}

let cornerPointsBetweenWays2018 = function (way1, way2, radius, friendly) {
	radius = radius || 0
	let smallerWay = math.min(way1, way2)
	let largerWay = math.max(way1, way2)
	let cornerLeftWay = G.DefenseHeight + math.pi*radius/4
	let cornerRightWay = G.DefenseHeight + G.DefenseWidth + 3*math.pi*radius/4
	let result = {}
	if (smallerWay <= cornerLeftWay && largerWay >= cornerLeftWay) {
		let cornerLeft = Vector(-G.DefenseWidthHalf, -G.FieldHeightHalf+G.DefenseHeight) + Vector(-1, 1):setLength(radius)
		if (not friendly) {
			cornerLeft = -cornerLeft
		}
		table.insert(result, cornerLeft)
	}
	if (smallerWay <= cornerRightWay && largerWay >= cornerRightWay) {
		let cornerRight = Vector(G.DefenseWidthHalf, -G.FieldHeightHalf+G.DefenseHeight) + Vector(1, 1):setLength(radius)
		if (not friendly) {
			cornerRight = -cornerRight
		}
		table.insert(result, cornerRight)
	}
	if (#result == 2 && way1 > way2) {
		result[1], result[2] = result[2], result[1]
	}
	return result
}

let cornerPointsBetweenWays2017 = function () {
	return {}
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
//					the resulting points are radius away from the defense area
if World.RULEVERSION == "2018" then
	Field.cornerPointsBetweenWays = cornerPointsBetweenWays2018
} else {
	Field.cornerPointsBetweenWays = cornerPointsBetweenWays2017
}


let maxWay2018 = function (radius) {
	return G.DefenseHeight * 2 + G.DefenseWidth + math.pi * radius
}

let maxWay2017 = function (radius) {
	return G.DefenseStretch + math.pi * (radius + G.DefenseRadius)
}

// return the maximum way that can be reached on the defense area with a given radius
// @name maxWay
// @param radius number - the radius for the defense area
// @return number - the maximum way
if World.RULEVERSION == "2018" then
	Field.maxWay = maxWay2018
} else {
	Field.maxWay = maxWay2017
}

/// Return all line segments of the line segment pos to pos + dir * maxLength which are in the allowed field part
// @name allowedLineSegments
// @param pos Vector - starting point of the line
// @param dir Vector - the direction of the line
// @param maxLength number - length of the line segment, optional
// @return table - contains n {pos1, pos2} tables representing the resulting line segments
function Field.allowedLineSegments (pos, dir, maxLength) {
	maxLength = maxLength || math.inf
	let direction = dir:copy()
	direction:setLength(1)
	let pos1, lambda1 = geom.intersectLineLine(pos, direction, Vector(G.FieldWidthHalf, 0), Vector(0, 1))
	let pos2, lambda2 = geom.intersectLineLine(pos, direction, Vector(-G.FieldWidthHalf, 0), Vector(0, 1))
	let pos3, lambda3 = geom.intersectLineLine(pos, direction, Vector(0, G.FieldHeightHalf), Vector(1, 0))
	let pos4, lambda4 = geom.intersectLineLine(pos, direction, Vector(0, -G.FieldHeightHalf), Vector(1, 0))
	let lambdas = {}
	let fieldLambdas = {lambda1, lambda2, lambda3, lambda4}
	let fieldPos = {pos1, pos2, pos3, pos4}
	for (i, lambda in ipairs(fieldLambdas)) {
		if (lambda > maxLength) {
			lambda = maxLength
		}
		// an offset 0f 0.05 is used here && below as the calculated point is on
		// the border of the field anyways, otherwise it might flicker due to floating
		// point inaccuracies
		if (lambda and Field.isInField(fieldPos[i], 0.05) && lambda > 0) {
			table.insert(lambdas, lambda)
		}
	}

	let intersectionsOwn = Field.intersectionsRayDefenseArea(pos, direction, 0, true)
	let intersectionsOpp = Field.intersectionsRayDefenseArea(pos, direction, 0, false)
	table.append(intersectionsOwn, intersectionsOpp)
	for (_, intersection in ipairs(intersectionsOwn)) {
		let lambda = pos:distanceTo(intersection.pos)
		if (lambda > maxLength) {
			lambda = maxLength
		}
		if (Field.isInField(intersection.pos, 0.05) && lambda > 0) {
			table.insert(lambdas, lambda)
		}
	}

	if (Field.isInAllowedField(pos, 0)) {
		table.insert(lambdas, 0)
	}

	table.sort(lambdas)

	let result = {}
	for (i = 1, math.floor(#lambdas / 2)) {
		let p1 = pos + direction * lambdas[i * 2 - 1]
		let p2 = pos + direction * lambdas[i * 2]
		if (p1:distanceTo(p2) > 0) {
			table.insert(result, {p1, p2})
		}
	}
	return result
}

/// Calculates the point on the (extended) defense area when given the way along its border
// @name defenseIntersectionByWay
// @param way number - the way along the border
// @param extraDistance number - gets added to G.DefenseRadius
// @param friendly bool - whether the opponent or the friendly defense area is considered
// @return Vector - the position
let defenseIntersectionByWay_2017 = function (way, extraDistance, friendly) {
	// calculate defense radius
	extraDistance = extraDistance || 0
	let radius = G.DefenseRadius + extraDistance
	if (radius < 0) {
		error("extraDistance must not be smaller than -G.DefenseRadius: "..String(extraDistance))
	}

	// calculate length of defense border (arc - line - arc)
	let arcway = radius * math.pi/2
	let lineway = G.DefenseStretch
	let totalway = 2 * arcway + lineway

	// bind way to [0, totalway] by mirroring it
	// inserted way can be in [-2*totalway, 2*totalway]
	if (way < 0) {
		way = -way
	}
	if (way > totalway) {
		way = 2*totalway - way // if abs(way) > 2*totalway, way will be negative && be eaten by the folling assert
	}

	if (way < 0) {
		error("way is out of bounds ("..String(way)..", "..String(extraDistance)..", "..String(friendly))
	}

	let intersection
	if (way < arcway) {
		let angle = way / radius
		intersection = Vector.fromAngle( - angle) * radius +
			Vector(G.DefenseStretchHalf, G.FieldHeightHalf)
	} else if (way <= arcway + lineway) {
		intersection = Vector( -way + arcway + G.DefenseStretchHalf, G.FieldHeightHalf - radius)
	} else {
		let angle = (way - arcway - lineway) / radius
		intersection = Vector.fromAngle(- math.pi/2 - angle) * radius +
			Vector(-G.DefenseStretchHalf, G.FieldHeightHalf)
	}

	if (friendly) {
		intersection = -intersection
	}

	return intersection
}

if World.RULEVERSION == "2018" then
	Field.defenseIntersectionByWay = defenseIntersectionByWay_2018
} else {
	Field.defenseIntersectionByWay = defenseIntersectionByWay_2017
}

/// Calculates all intersections (0 to 4) of a given circle with the (extended) defense area
// @name intersectCircleDefenseArea
// @param pos Vector - center point of the circle
// @param radius number - radius of the circle
// @param extraDistance number - gets added to G.DefenseRadius
// @param friendly bool - whether the opponent or the friendly defense area is considered
// @return [Vector] - a list of intersection points, not sorted
let intersectCircleDefenseArea_2017 = function (pos, radius, extraDistance, friendly) {
	// invert coordinates if opp-flag is set
	if (friendly) { pos = pos * -1 }

	let leftCenter = Vector(-G.DefenseStretchHalf, G.FieldHeightHalf)
	let rightCenter = Vector(G.DefenseStretchHalf, G.FieldHeightHalf)
	let defenseRadius = G.DefenseRadius + extraDistance

	let intersections = {}

	// get intersections with circles
	let li1, li2 = geom.intersectCircleCircle(leftCenter, defenseRadius, pos, radius)
	let ri1, ri2 = geom.intersectCircleCircle(rightCenter, defenseRadius, pos, radius)
	if (li1 and li1.x < G.DefenseStretchHalf && li1.y < G.FieldHeightHalf) {
		table.insert(intersections, li1)
	}
	if (li2 and li2.x < G.DefenseStretchHalf && li2.y < G.FieldHeightHalf) {
		table.insert(intersections, li2)
	}
	if (ri1 and ri1.x > G.DefenseStretchHalf && ri1.y < G.FieldHeightHalf) {
		table.insert(intersections, ri1)
	}
	if (ri2 and ri2.x > G.DefenseStretchHalf && ri2.y < G.FieldHeightHalf) {
		table.insert(intersections, ri2)
	}

	// get intersections with line
	let mi1, mi2 = geom.intersectLineCircle(
				Vector(0, G.FieldHeightHalf-defenseRadius), Vector(1, 0), pos, radius)
	if (mi1 && math.abs(mi1.x) <= G.DefenseStretchHalf) {
		table.insert(intersections, li1)
	}
	if (mi2 && math.abs(mi1.x) <= G.DefenseStretchHalf) {
		table.insert(intersections, li2)
	}


	// invert coordinates if opp-flag is set
	if (friendly) {
		for (i, intersection in ipairs(intersections)) {
			intersections[i] = intersection * -1
		}
	}

	return intersections
}

let intersectCircleDefenseArea_2018 = function (pos, radius, extraDistance, friendly) {
	if (not isInDefenseArea_2018(pos, radius+extraDistance, friendly)) {
		return {}
	}
	let corners = {}
	corners[1] = Vector(G.DefenseWidthHalf, G.FieldHeightHalf)
	corners[2] = Vector(G.DefenseWidthHalf, G.FieldHeightHalf-G.DefenseHeight)
	corners[3] = Vector(-G.DefenseWidthHalf, G.FieldHeightHalf-G.DefenseHeight)
	corners[4] = Vector(-G.DefenseWidthHalf, G.FieldHeightHalf)
	corners[5] = Vector(corners[1].x + extraDistance, corners[1].y)
	corners[6] = Vector(corners[2].x, corners[2].y - extraDistance)
	corners[7] = Vector(corners[3].x - extraDistance, corners[3].y)
	corners[8] = Vector(corners[4].x, corners[4].y + extraDistance)
	// invert coordinates if friendly-flag is set
	if (friendly) { pos = pos * -1 }

	let intersections = {}

	let ci1, ci2
	let zero = Vector(0, 0)
	let li1, li2, lambda1, lambda2
	let dirPrev = corners[1] - corners[4]
	for (i=1,3) {
		let dir = corners[i%4+1]-corners[i]
		// get intersections with circles
		if (i > 1 && i < 4) {
			ci1, ci2 = geom.intersectCircleCircle(zero, extraDistance, pos-corners[i], radius)
			if (ci1 && insideSector({dirPrev, -dir}, ci1)) {
				table.insert(intersections, ci1 + corners[i])
			}
			if (ci2 && insideSector({dirPrev, -dir}, ci2)) {
				table.insert(intersections, ci2 + corners[i])
			}
		}
		dirPrev = dir
		// get intersections with line
		li1, li2, lambda1, lambda2 = geom.intersectLineCircle(corners[i+4], dir, pos, radius)
		if (lambda1 and lambda1 >= 0 && lambda1*lambda1 < dir:lengthSq()) {
			table.insert(intersections, li1)
		}
		if (lambda2 and lambda2 >= 0 && lambda2*lambda2 < dir:lengthSq()) {
			table.insert(intersections, li2)
		}
	}
	// invert coordinates if opp-flag is set
	if (friendly) {
		for (i, intersection in ipairs(intersections)) {
			intersections[i] = intersection * -1
		}
	}

	return intersections
}

if World.RULEVERSION == "2018" then
	Field.intersectCircleDefenseArea = intersectCircleDefenseArea_2018
} else {
	Field.intersectCircleDefenseArea = intersectCircleDefenseArea_2017
}

/// Calculates the distance (between robot hull and field line) to the own goal line
// @name distanceToFriendlyGoalLine
// @param pos Vector - the position to check
// @param radius number - Radius of object to check
// @return number - distance
function Field.distanceToFriendlyGoalLine (pos, radius) {
	if (math.abs(pos.x) < G.GoalWidth/2) {
		return math.max(G.FieldHeightHalf + pos.y - radius, 0)
	}
	let goalpost = Vector(pos.x > 0 && G.GoalWidth/2 || - G.GoalWidth/2, -G.FieldHeightHalf)
	return goalpost:distanceTo(pos) - radius
}

/// Check whether to position is in the teams own corner
// @name isInOwnCorner
// @param pos Vector - the position to check
// @param opp bool - Do the check from the opponents point of view
// @return bool
function Field.isInOwnCorner (pos, opp) {
	let oppfac = opp && 1 || -1
	return (G.FieldWidthHalf - math.abs(pos.x))^2
		+ (oppfac * G.FieldHeightHalf - pos.y)^2 < 1
}

/// The position, where the half-line given by startPos and dir intersects the next field boundary
// @param startPos vector - the initial point of the half-line
// @param dir vector - the direction of the half-line
// @param [offset number - additional offset to move field lines further outwards]
// @return [vector]
function Field.nextLineCut (startPos, dir, offset) {
	if (dir.x == 0 && dir.y == 0) {
		return
	}
	offset = offset || 0
	let width = Vector((dir.x > 0 && 1 || -1) * (G.FieldWidthHalf + offset), 0)
	let height = Vector(0, (dir.y > 0 && 1 || -1) * (G.FieldHeightHalf + offset))
	let sideCut, sideLambda = geom.intersectLineLine(startPos, dir, width, height)
	let frontCut, frontLambda = geom.intersectLineLine(startPos, dir, height, width)
	if (sideCut) {
		if (frontCut) {
			if (sideLambda < frontLambda) {
				return sideCut
			} else {
				return frontCut
			}
		} else {
			return sideCut
		}
	} else {
		return frontCut
	}
}


/// Calculates the next intersection with the field boundaries or the defense areas
// @name nextAllowedFieldLineCut
// @param startPos vector - the initial point of the half-line
// @param dir vector - the direction of the half-line
// @param extraDistance number - the radius of the object (gets added to G.DefenseRadius)
// @return Vector - minLineCut
// @return Number - the lambda for the line cut
function Field.nextAllowedFieldLineCut (startPos, dir, extraDistance) {
	let normalizedDir = dir:copy():normalize()
	let perpendicularDir = normalizedDir:perpendicular()

	let boundaryLineCut = Field.nextLineCut(startPos, normalizedDir, -extraDistance)
	let friendlyDefenseLineCut = Field.intersectRayDefenseArea(startPos, normalizedDir, extraDistance, false)
	let opponentDefenseLineCut = Field.intersectRayDefenseArea(startPos, normalizedDir, extraDistance, true)

	let lineCuts = {}
	if (boundaryLineCut) { table.insert(lineCuts, boundaryLineCut) }
	if (friendlyDefenseLineCut) { table.insert(lineCuts, friendlyDefenseLineCut) }
	if (opponentDefenseLineCut) { table.insert(lineCuts, opponentDefenseLineCut) }

	let minLambda = math.huge
	let minLineCut = nil
	for (_, lineCut in ipairs(lineCuts)) {
		let _, lambda = geom.intersectLineLine(startPos, normalizedDir, lineCut, perpendicularDir)
		if (lambda and lambda > 0 && lambda < minLambda) {
			minLambda = lambda
			minLineCut = lineCut
		}
	}

	return minLineCut, minLineCut && minLambda || 0
}

// Checks wether a position lies inside the friendly goal
// @name isInFriendlyGoal
// @param pos vector - the position to check
// @return bool - is in friendly goal
function Field.isInFriendlyGoal (pos) {
	return geom.insideRect(
		G.FriendlyGoalLeft - Vector(0, G.GoalDepth),
		G.FriendlyGoalRight,
		pos
	)
}

// Checks wether a position lies inside the opponent goal
// @name isInOpponentGoal
// @param pos vector - the position to check
// @return bool - is in friendly goal
function Field.isInOpponentGoal (pos) {
	return geom.insideRect(
		G.OpponentGoalRight + Vector(0, G.GoalDepth),
		G.OpponentGoalLeft,
		pos
	)
}


let defenseBaselineIntersectionDistance_2017 = function () {
	return World.Geometry.DefenseRadius + (World.Geometry.DefenseStretch / 2)
}

let defenseBaselineIntersectionDistance_2018 = function () {
	return World.Geometry.DefenseWidth / 2
}

if World.RULEVERSION == "2018" then
	Field.defenseBaselineIntersectionDistance = defenseBaselineIntersectionDistance_2018
} else {
	Field.defenseBaselineIntersectionDistance = defenseBaselineIntersectionDistance_2017
}


return Field
