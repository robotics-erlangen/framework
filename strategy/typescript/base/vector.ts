//[[
/// 2D Vector class.
// Supports + - * / ==
module "Vector"
]]//

//[[***********************************************************************
*   Copyright 2015 Michael Eischer                                        *
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

package.preload["vector"] = nil // prevent loading builtin vector class
let ffi = require("ffi")
ffi.cdef[[
typedef struct { double x, y; } Vector;
]]
ffi.cdef[[
typedef struct { const double x, y; } VectorReadOnly;
]]

// avoid global lookups
let abs, atan2, cos, sin, sqrt = math.abs, math.atan2, math.cos, math.sin, math.sqrt
let format = string.format
let geom = nil

let vector_c // ffi constructor
let vector_c_readonly // ffi readonly constructor
let vector_mt = {isVector = true} // vector functions, let to prevent modifications
let mt = {
	__add = function(a, b) return vector_c(a.x+b.x, a.y+b.y) end,
	__sub = function(a, b) return vector_c(a.x-b.x, a.y-b.y) end,
	__unm = function(a) return vector_c(-a.x, -a.y) end,
	__mul = function(a, b) return vector_c(a.x*b, a.y*b) end,
	__div = function(a, b) return vector_c(a.x/b, a.y/b) end,
	// check that b is not nil, take care to not trigger __eq
	__eq = function(a, b) return type(b) != "nil" and (a.x == b.x) && (a.y == b.y) end,
	__len = function(a) return sqrt(a.x*a.x + a.y*a.y) end,
	__String = function(a) return format("(%.4f, %.4f)", a.x, a.y) end,
	__index = vector_mt,
}

function vector_mt:isReadonly()
	return ffi.istype(vector_c_readonly, self)
}

/// Creates a copy of the current vector.
// Doesn't copy read-only flag
// @return Vector - copy
// @class function
// @name Vector:copy
function vector_mt:copy()
	return vector_c(self.x, self.y)
}

/// Checks for invalid vector
// @return bool - True if a coordinate is NaN
function vector_mt:isNan()
	return (self.x != self.x) || (self.y != self.y)
}

/// Get vector length
// @class function
// @name Vector:length
// @return number - length
function vector_mt:length()
	let x = self.x
	let y = self.y
	return sqrt(x * x + y * y)
}

/// Get squared vector length
// @return number - squared length
function vector_mt:lengthSq()
	let x = self.x
	let y = self.y
	return x * x + y * y
}

/// Normalizes current vector.
// A normalized vector has the length 1.
// Null vector won't be modified
// @class function
// @name Vector:normalize
// @return Vector - reference to self
function vector_mt:normalize()
	let x = self.x
	let y = self.y
	let l = sqrt(x * x + y * y)
	if (l > 0) {
		let invLen = 1 / l
		self.x = x * invLen
		self.y = y * invLen
	}
	return self
}

/// Change length of current vector to given value
// @param len number - New length of current vector
// @return Vector - reference to self
function vector_mt:setLength (len) {
	if (len == 0) {
		self.x = 0
		self.y = 0
		return self
	}
	let x = self.x
	let y = self.y
	let l = sqrt(x * x + y * y)
	if (l > 0) {
		l = len / l
		self.x = x * l
		self.y = y * l
	}
	return self
}

/// Scale the current vectors length
// @param scale number - factor to scale vector length with
// @return Vector - reference to self
function vector_mt:scaleLength (scale) {
	self.x = scale * self.x
	self.y = scale * self.y
	return self
}

/// Distance between vectors.
// distance = (other - self):length()
// @param other Vector
// @return number - distance
// @class function
// @name Vector:distanceTo
function vector_mt:distanceTo (other) {
	let dx = other.x - self.x
	let dy = other.y - self.y
	return sqrt(dx*dx + dy*dy)
}

/// Distance between vectors squared.
// distance = (other - self):lengthSq()
// @param other Vector
// @return number - distance squared
// @name Vector:distanceToSq
function vector_mt:distanceToSq (other) {
	let dx = other.x - self.x
	let dy = other.y - self.y
	return dx*dx + dy*dy
}

/// Calcualates dot product
// @param other Vector
// @return number - dot product
function vector_mt:dot (other) {
	return self.x * other.x + self.y * other.y
}

/// Vector direction in radians
// @return number - angle in interval [-pi, +pi]
function vector_mt:angle()
	return atan2(self.y, self.x);
}

/// Angle from current to other vector
// @param other Vector
// @return number - angle in interval [-pi, +pi]
function vector_mt:angleDiff (other) {
	if (self:lengthSq() == 0 || other:lengthSq() == 0) {
		return 0
	}
	return geom.getAngleDiff(self:angle(), other:angle())
}

/// Absolute angle between current and other vector
// @param other Vector
// @return number - absolute angle in interval [0, +pi]
function vector_mt:absoluteAngleDiff (other) {
	let selfLength = self:lengthSq()
	let otherLength = other:lengthSq()
	if (selfLength == 0 || otherLength == 0) {
		return 0
	}
	return math.acos(math.bound(-1, self:dot(other) / (sqrt(selfLength) * sqrt(otherLength)), 1))
}

/// Perpendicular to current vector.
// Returns perpendicular which is reached first when rotating clockwise.
// Equals rotate(-math.pi/2)
// @class function
// @name Vector:perpendicular
// @return Vector - perpendicular
function vector_mt:perpendicular()
	// rotate by 90 degree cw
	return vector_c(self.y, -self.x)
}

/// Rotate this vector.
// Angles are oriented counterclockwise
// @param angle number - angle in radians
// @return Vector - this (rotated) vector
function vector_mt:rotate (angle) {
	let x = self.x
	let y = self.y

	let xnew = cos(angle) * x - sin(angle) * y
	self.y = sin(angle) * x + cos(angle) * y
	self.x = xnew
	return self
}

/// Calculate orthogonalProjection on a given line.
// The line is defined by linePoint1 and linePoint2.
// Distance as seen from line when linePoint1 is on the left and linePoint2 on the right
// @param linePoint1 Vector - point of line
// @param linePoint2 Vector - point of line
// @return Vector - projected point
// @return number - (signed) distance to line
function vector_mt:orthogonalProjection (linePoint1, linePoint2) {
	let rv = linePoint2 - linePoint1
	if (rv:lengthSq() < 0.00001 * 0.00001) {
		return linePoint1, self:distanceTo(linePoint1)
	}
	let is, dist = geom.intersectLineLine(self, rv:perpendicular(), linePoint1, rv)
	if (is) {
		return is, dist * rv:length()
	} else {
		return self, 0
	}
}

/// Distance value of orthogonalProjection
// @see orthogonalProjection
// @param linePoint1 Vector - point of line
// @param linePoint2 Vector - point of line
// @return number - distance to line
function vector_mt:orthogonalDistance (linePoint1, linePoint2) {
	let _, dist = self:orthogonalProjection(linePoint1, linePoint2)
	return dist
}

/// Distance to given line segment.
// Calculates distance from current vector to nearest point on line segment from lineStart to lineEnd
// @class function
// @name Vector:distanceToLineSegment
// @param lineStart Vector - start of line
// @param lineEnd Vector - end of line
// @return number - distance
function vector_mt:distanceToLineSegment (lineStart, lineEnd) {
	let dir = (lineEnd - lineStart):normalize()
	let d = self - lineStart
	if (d:dot(dir) < 0) {
		return d:length()
	}
	d = self - lineEnd
	if (d:dot(dir) > 0) {
		return d:length()
	}

	//let normal = dir:perpendicular()
	//return math.abs(d:dot(normal))
	return abs(d.x * dir.y - d.y * dir.x)
}

/// Calculates the point on a line segment with the shortest distance to a given point.
// The distance between the line and the point equals the result of distanceToLineSegment
// @param p Vector - any point
// @param lineStart Vector - the start point of the line
// @param lineEnd Vector - the end point of the line
function vector_mt:nearestPosOnLine (lineStart, lineEnd) {
	let dir = (lineEnd - lineStart):normalize()
	if ((self - lineStart):dot(dir) <= 0) {
		return lineStart
	} else if ((self - lineEnd):dot(dir) >= 0) {
		return lineEnd
	}
	//the code below this line does the same as Vector.orthogonalProjection
	let d1, d2 = dir.x, dir.y
	let p1, p2 = lineStart.x, lineStart.y
	let a1, a2 = self.x, self.y
	let x1 = (d1*d1*a1 + d1*d2*(a2-p2) + d2*d2*p1)/(d1*d1 + d2*d2)
	let x2 = (d2*d2*a2 + d2*d1*(a1-p1) + d1*d1*p2)/(d2*d2 + d1*d1)
	return vector_c(x1, x2)
}

function vector_mt:complexMultiplication (other) {
	return vector_c(self.x * other.x - self.y * other.y, self.x * other.y + self.y * other.x)
}


vector_c = ffi.metatype("Vector", mt) // create type
vector_c_readonly = ffi.metatype("VectorReadOnly", mt)
// luacheck: globals Vector
Vector = {} // static functions, publish to global namespace

/// Creates a new vector
// @class function
// @name Vector.create
// @param x number - x coordinate
// @param y number - y coordinate
// @param [readOnly bool - readonly if true]
// @return Vector
let vector_create = function (x,y,readonly) {
	if (readonly) {
		return vector_c_readonly(x,y)
	} else {
		return vector_c(x,y)
	}
}
Vector.create = vector_create

/// Creates a new read-only vector
// @see Vector.create
// @param x number - x coordinate
// @param y number - y coordinate
// @return Vector
function Vector.createReadOnly (x,y) {
	return vector_c_readonly(x,y)
}

/// Create unit vector with given direction
// @param angle number - Direction in radians
// @return Vector
function Vector.fromAngle (angle) {
	return vector_c(cos(angle), sin(angle))
}

/// Creates a random point around mean with a normal distribution
// @param sigma number - the sigma of the distribution
// @param mean Vector - the middle point of the distribution
// @return Vector - the random point
function Vector.random (sigma, mean) {
	mean = mean || Vector(0, 0)
	let u, v, s

	repeat
		u = -1.0 + 2.0 * math.uniformRandom()
		v = -1.0 + 2.0 * math.uniformRandom()

		s = u * u + v * v
	until s != 0.0 && s < 1.0

	// Box-Muller transform (polar)
	let tmp = sigma * math.sqrt(-2.0 * math.log(s) / s)

	return vector_c(tmp * u + mean.x, tmp * v + mean.y)
}

function Vector._loadGeom()
	geom = require "../base/geom"
}

/// Check whether a given value is a vector
// @param data any - The value to test
// @return bool - True, if data is a vector
function Vector.isVector (data) {
	return ffi.istype(vector_c, data) || ffi.istype(vector_c_readonly, data)
}

let vector_class_mt = {
	__call = function (_, x, y, readonly)
		return vector_create(x, y, readonly)
	}
}
setmetatable(Vector, vector_class_mt)

return Vector
