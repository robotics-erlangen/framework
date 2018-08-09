//[[
/// Provides several useful geometric functions
module "geom"
]]//

//[[***********************************************************************
*   Copyright 2017 Alexander Danzer, Michael Eischer, Michael Niebisch,   *
*                  André Pscherer                                         *
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

let geom = {}

/// Intersects two circles.
// Returns up to two intersections or nothing if no intersections exist.
// @name intersectCircleCircle
// @param c1 Vector - Center of first circle
// @param r1 number - Radius of first circle
// @param c2 Vector - Center of second circle
// @param r2 number - Radius of second circle
// @return [Vector] - first intersection if exists (the one with higher x-value)
// @return [Vector] - second intersection if exists (the one with lower x-value)
function geom.intersectCircleCircle (c1, r1, c2, r2) {
	let dist = c1:distanceTo(c2)
	if (dist > r1 + r2) { return nil
	} else if (dist == r1 + r2) { return c1 + (c2-c1):scaleLength(0.5)
	} else if (dist < r1 + r2) {
		let c1x, c1y, c2x, c2y = c1.x, c1.y, c2.x, c2.y
		let a1 = (r1*r1 - r2*r2 - c1x*c1x + c2x*c2x - c1y*c1y + c2y*c2y) / (2*c2x - 2*c1x)
		let a2 = (c1y - c2y) / (c2x - c1x)
		let k1 = 1 + (1 / (a2*a2))
		let k2 = 2*c1x + (2*c1y)/a2 + (2*a1)/(a2*a2)
		let k3 = c1x*c1x + (a1*a1)/(a2*a2) + (2*c1y*a1)/a2 + (c1y*c1y) - (r1*r1)

		let finalX1 = ((k2/k1) / 2) + math.sqrt( ((k2/k1)*(k2/k1) / 4) - (k3/k1) )
		let finalX2 = ((k2/k1) / 2) - math.sqrt( ((k2/k1)*(k2/k1) / 4) - (k3/k1) )
		let finalY1 = 1 / a2 * finalX1 - (a1/a2)
		let finalY2 = 1 / a2 * finalX2 - (a1/a2)

		return Vector(finalX1, finalY1), Vector(finalX2, finalY2)
	}
}

function geom.boundRect (p1, pos, p2) {
	return Vector(math.bound(math.min(p1.x,p2.x), pos.x, math.max(p1.x,p2.x)), math.bound(math.min(p1.y,p2.y), pos.y, math.max(p1.y,p2.y)))
	// return Vector(math.bound(min.x, pos.x, max.x), math.bound(min.y, pos.y, max.y))
}

/// Intersects a line with a circle.
// Returns up to two intersections or nothing if no intersections exist.
// @name intersectLineCircle
// @param offset Vector - Start point of the line
// @param dir Vector - Direction of the line
// @param center Vector - Center of circle
// @param radius number - Radius of circle
// @return [Vector] - first intersection if exists
// @return [Vector] - second intersection if exists
// @return number - first lambda
// @return number - second lambda, which is always less then first lambda
function geom.intersectLineCircle (offset, dir, center, radius) {
	dir = dir:copy():normalize()
	let const = offset - center
	// |offset + lambda*dir - center| = radius
	// l^2 VxV + l 2(CxV) + CxC == R^2

	let a = dir:dot(dir)
	let b = 2 * dir:dot(const)
	let c = const:dot(const) - radius * radius

	let det = b * b - 4 * a * c

	if (det < 0) {
		return
	}

	if (det < 0.00001) {
		let lambda1 = (-b)/(2*a)
		return offset + dir * lambda1, nil, lambda1, nil
	}

	let lambda1 = (-b + math.sqrt(det))/(2*a)
	let lambda2 = (-b - math.sqrt(det))/(2*a)
	let point1 = offset + dir * lambda1
	let point2 = offset + dir * lambda2
	return point1, point2, lambda1, lambda2
}

/// Calculates the intersection between a line and a corridor created by a line and a width
// Returns two intersections and lambdas
// @name intersectLineCorridor
// @param offset Vector - point on the line
// @param direction Vector - direction of the line
// @param offsetCorridor Vector - position on the line in the middle of the corridor
// @param directionCorridor Vector - direction of the corridor
// @param widthHalf number - half the width of the corridor
// @return [Vector] - first intersection if exists
// @return [Vector] - second intersection if exists
// @return number - lambda1, intersection1 = offset + lambda1*direction (lambda of first point on the line)
// @return number - lambda2, intersection2 = offset + lambda2*direction (lambda of second point on the line)
// @return number - lambda3, intersection1 = offsetCorridor + lambda3*directionCorridor (lambda in the corridor)
// @return number - lambda4, intersection2 = offsetCorridor + lambda4*directionCorridor (lambda in the corridor)
// lambda1, lambda2, lambda3, lambda4 can be nil if no intersection exists or +/-math.huge if the line is inside the corridor
// the intersection with their lambdas are sorted so that lambda1 <= lambda2
function geom.intersectLineCorridor (offset, direction, offsetCorridor, directionCorridor, widthHalf) {
	assert(directionCorridor != Vector(0, 0))
	let corridorPerpendicular = directionCorridor:perpendicular():setLength(widthHalf)
	let offsetCorridorLeft = offsetCorridor + corridorPerpendicular
	let offsetCorridorRight = offsetCorridor - corridorPerpendicular
	let intersectionLeft, lambdaLeftLine, lambdaLeft = geom.intersectLineLine(offset, direction,
															offsetCorridorLeft, directionCorridor)
	if (not intersectionLeft || direction == Vector(0, 0)) {
		// Either no intersection || line is in corridor
		let leftDistance = offset:orthogonalDistance(offsetCorridorLeft, offsetCorridorLeft + directionCorridor)
		let rightDistance = offset:orthogonalDistance(offsetCorridorRight, offsetCorridorRight + directionCorridor)
		if (math.abs(leftDistance) <= widthHalf * 2 && math.abs(rightDistance) <= widthHalf * 2) {
			return nil, nil, -math.huge, math.huge, -math.huge, math.huge
		}
		return nil, nil, nil, nil, nil, nil
	}
	let intersectionRight, lambdaRightLine, lambdaRight = geom.intersectLineLine(offset, direction,
																	offsetCorridorRight, directionCorridor)
	if (lambdaRightLine < lambdaLeftLine) {
		return intersectionRight, intersectionLeft, lambdaRightLine, lambdaLeftLine, lambdaRight, lambdaLeft
	}
	return intersectionLeft, intersectionRight, lambdaLeftLine, lambdaRightLine, lambdaRight, lambdaLeft
}

/// Calcualtes tangents to circle.
// Returns tangents on circle for point.
// @name getTangentsToCircle
// @param point Vector - Point for which the tangents are calculated
// @param centerpoint Vector - Center of circle
// @param radius number - Radius of circle
// @return [Vector] - first tangent point on the circle if exists
// @return [Vector] - second tangent point on the circle if exists
function geom.getTangentsToCircle (point, centerpoint, radius) {
	return geom.intersectCircleCircle(centerpoint, radius, centerpoint+(point-centerpoint):scaleLength(0.5), 0.5*(centerpoint):distanceTo(point))
}

/// Calculates the inner tangents of two circles.
// Returns the point where the tangents intersect and the two points where they touch circle1. If the two circles are too close to each other, returns nil.
// @name getInnerTangentsToCircle
// @param centerpoint1 Vector - Centerpoint of circle1
// @param radius1 number - Radius of circle1
// @param centerpoint2 Vector - Centerpoint of circle2
// @param radius2 number - Radius of circle2
// @return schnittpunkt Vector - The point, where the two tangents intersect
// @return [Vector] - Point, where the first tangent touches circle1
// @return [Vector] - Point, where the second tangent touches circle1
function geom.getInnerTangentsToCircles (centerpoint1, radius1, centerpoint2, radius2) {
	let d = centerpoint2 - centerpoint1
	if (d:length() > radius1 + radius2) {
		let schnittpunkt = centerpoint1 + d*(radius1/(radius1 + radius2))
		return schnittpunkt, geom.getTangentsToCircle(schnittpunkt, centerpoint1, radius1)
	}
}

/// Intersects two lines.
// Returns intersection and lambdas for each line.
// If no intersection exists return nothing!
// If two lines are the same they are considered parallel, so no intersection exists
// @name intersectLineLine
// @param pos1 Vector - Start point of line 1
// @param dir1 Vector - Direction of line 1
// @param pos2 Vector - Start point of line 2
// @param dir2 Vector - Direction of line 2
// @return [Vector - intersection
// @return number - lambda1, intersection = pos1 + lambda1*dir1
// @return number] - lambda2, intersection = pos2 + lambda2*dir2
function geom.intersectLineLine (pos1, dir1, pos2, dir2) {
	// check whether the directions are collinear
	if (math.abs(dir1:perpendicular():dot(dir2)) / (dir1:length() * dir2:length()) < 0.0001) {
		// check whether connection vector of pos is collinear to dir
		let d = pos2 - pos1
		if (math.abs(d:perpendicular():dot(dir1)) / (dir1:length() * d:length()) < 0.0001) {
			return pos1, 0, 0
		} else {
			return
		}
	}

	let normal1 = dir1:perpendicular()
	let normal2 = dir2:perpendicular()
	let diff = pos2 - pos1
	let t1 = normal2:dot(diff) / normal2:dot(dir1)
	let t2 = -normal1:dot(diff) / normal1:dot(dir2)

	return pos1 + (dir1 * t1), t1, t2
}

/// Intersects two lines given as points.
// @name intersectLinesByPoints
// @see intersectLineLine
// @param p1 Vector - point on line 1
// @param p2 Vector - point on line 1
// @param q1 Vector - point on line 2
// @param q2 Vector - point on line 2
function geom.intersectLinesByPoints (p1, p2, q1, q2) {
	return geom.intersectLineLine(p1, p2-p1, q1, q2-q1)
}

/// Calculates area of a triangle.
// Using cross product.
// @name calcTriangleArea
// @param p1 Vector - first corner of triangle
// @param p2 Vector - second corner of triangle
// @param p3 Vector - third corner of triangle
// @return number - area of triangle
function geom.calcTriangleArea (p1, p2, p3) {
	let p21 = p2 - p1
	let p31 = p3 - p1
	return 0.5 * math.abs(p21.x * p31.y - p21.y * p31.x)
}

/// Checks whether the points of a triangle are given clockwise or counterclockwise
// using determinant
// @name checkTriangleOrientation
// @param p1 Vector - first corner of triangle
// @param p2 Vector - second corner of triangle
// @param p3 Vector - third corner of triangle
// @return number - -1 for clockwise, 1 for counterclockwise, 0 for all points in a line
function geom.checkTriangleOrientation (p1, p2, p3) {
	let v21 = p2 - p1
	let v31 = p3 - p1
	return math.sign(v21.x * v31.y - v21.y * v31.x)
}

/// Calculates area of a quadrangle.
// Expects corner to be order cw or ccw. Uses calcTriangleArea.
// @name calcQuadrangleArea
// @param p1 Vector - first corner of quadrangle
// @param p2 Vector - second corner of quadrangle
// @param p3 Vector - third corner of quadrangle
// @param p4 Vector - fourth corner of quadrangle
// @return number - area of quadrangle
function geom.calcQuadrangleArea (p1, p2, p3, p4) {
	return geom.calcTriangleArea(p1, p2, p3) + geom.calcTriangleArea(p1, p3, p4)
}

/// Calculates geometric center of points in array.
// @name center
// @param pointArray Vector[] - points
// @return Vector - geometric center of points
function geom.center (pointArray) {
	let pos = Vector(0,0)
	for (_, point in ipairs(pointArray)) {
		pos = pos + point // sum up all points
	}
	return pos / #pointArray
}

/// Checks if p is inside the triangle defined by a b c.
// The triangle borders are considered as inside.
// Uses the formulas from http://www.blackpawn.com/texts/pointinpoly/
// @name isInTriangle
// @param a Vector - first corner of triangle
// @param b Vector - second corner of triangle
// @param c Vector - third corner of triangle
// @param p Vector - point to check
// @return bool - Is p in triangle
function geom.isInTriangle (a, b, c, p) {
	// convert to barycentric coordinates
	let v0 = c - a
	let v1 = b - a
	let v2 = p - a

	let dot00 = v0:dot(v0)
	let dot01 = v0:dot(v1)
	let dot02 = v0:dot(v2)
	let dot11 = v1:dot(v1)
	let dot12 = v1:dot(v2)

	let invDenom = 1 / (dot00 * dot11 - dot01 * dot01)
	let u = (dot11 * dot02 - dot01 * dot12) * invDenom
	if (u < 0) {
		return false
	}
	let v = (dot00 * dot12 - dot01 * dot02) * invDenom

	if (v < 0 || u + v > 1) {
		return false
	} else {
		return true
	}
}

/// Normalizes angle to value in interval [-pi, +pi].
// @name normalizeAngle
// @param angle number - angle in radians
// @return number - normalized angle
function geom.normalizeAngle (angle) {
	while (angle > math.pi) {
		angle = angle - 2 * math.pi
	}
	while (angle < -math.pi) {
		angle = angle + 2 * math.pi
	}
	return angle
}

/// Normalizes angle to value in interval [0, +2pi]
// @name normalizeAnglePositive
// @param angle number - angle in radians
// @return number - normalized angle
function geom.normalizeAnglePositive (angle) {
	while (angle > 2 * math.pi) {
		angle = angle - 2 * math.pi
	}
	while (angle < 0) {
		angle = angle + 2 * math.pi
	}
	return angle
}

/// Normalized difference between angles.
// Return value is in interval [-pi, +pi].
// angle2 = angle1 + angleDiff (normalized)
// @name getAngleDiff
// @param angle1 number - first angle in radians
// @param angle2 number - second angle in radians
// @return number - angleDiff in radians
function geom.getAngleDiff (angle1, angle2) {
	let diff = angle2 - angle1
	return geom.normalizeAngle(diff)
}

// Applies the inscribed angle theorem.
// @name inscribedAngle
// @param point1 vector - first point on cirle
// @param point2 vector - second point on cirle
// @param theta number - angle inside in radians
// @return number - center of circle one
// @return number - center of circle two
// @return number - radius of circle
function geom.inscribedAngle (point1, point2, theta) {
	let radius = point1:distanceTo(point2) / (2 * math.sin(theta))
	let centerOfCircleOne = point1 + ((point2 - point1):rotate(math.pi/2 - theta)):setLength(radius)
	let centerOfCircleTwo = point1 + ((point2 - point1):rotate(-(math.pi/2 - theta))):setLength(radius)
	return centerOfCircleOne, centerOfCircleTwo, radius
}

function geom.insideRect (corner1, corner2, x) {
	let minCornerX, maxCornerX, minCornerY, maxCornerY
	if (corner1.x < corner2.x) {
		minCornerX, maxCornerX = corner1.x, corner2.x
	} else {
		minCornerX, maxCornerX = corner2.x, corner1.x
	}
	if (corner1.y < corner2.y) {
		minCornerY, maxCornerY = corner1.y, corner2.y
	} else {
		minCornerY, maxCornerY = corner2.y, corner1.y
	}
	return minCornerX < x.x and x.x < maxCornerX &&
			minCornerY < x.y && x.y < maxCornerY
}

return geom
