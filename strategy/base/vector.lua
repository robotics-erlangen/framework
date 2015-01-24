--[[
--- 2D Vector class.
-- Supports + - * / ==
module "Vector"
]]--

--[[***********************************************************************
*   Copyright 2015 Michael Eischer                                        *
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
*************************************************************************]]

package.preload["vector"] = nil -- prevent loading builtin vector class
local ffi = require("ffi")
ffi.cdef[[
typedef struct { double x, y; } Vector;
]]
ffi.cdef[[
typedef struct { const double x, y; } VectorReadOnly;
]]

-- avoid global lookups
local abs, atan2, cos, sin, sqrt = math.abs, math.atan2, math.cos, math.sin, math.sqrt
local format = string.format

local vector_c -- ffi constructor
local vector_c_readonly -- ffi readonly constructor
local vector_mt = {isVector = true} -- vector functions, local to prevent modifications
local mt = {
  __add = function(a, b) return vector_c(a.x+b.x, a.y+b.y) end,
  __sub = function(a, b) return vector_c(a.x-b.x, a.y-b.y) end,
  __unm = function(a) return vector_c(-a.x, -a.y) end,
  __mul = function(a, b) return vector_c(a.x*b, a.y*b) end,
  __div = function(a, b) return vector_c(a.x/b, a.y/b) end,
  -- check that b is not nil, take care to not trigger __eq
  __eq = function(a, b) return type(a) ~= "nil" and type(b) ~= "nil" and (a.x == b.x) and (a.y == b.y) end,
  __len = function(a) return sqrt(a.x*a.x + a.y*a.y) end,
  __tostring = function(a) return format("(%.4f, %.4f)", a.x, a.y) end,
  __index = vector_mt,
}

--- Creates a copy of the current vector.
-- Doesn't copy read-only flag
-- @return Vector - copy
-- @class function
-- @name Vector:copy
function vector_mt:copy()
	return vector_c(self.x, self.y)
end

--- Checks for invalid vector
-- @return bool - True if a coordinate is NaN
function vector_mt:isNan()
	return (self.x ~= self.x) or (self.y ~= self.y)
end

--- Get vector length
-- @class function
-- @name Vector:length
-- @return number - length
function vector_mt:length()
	return sqrt(self.x * self.x + self.y * self.y)
end

--- Get squared vector length
-- @return number - squared length
function vector_mt:lengthSq()
	return self.x * self.x + self.y * self.y
end

--- Normalizes current vector.
-- A normalized vector has the length 1.
-- Null vector won't be modified
-- @class function
-- @name Vector:normalize
-- @return Vector - reference to self
function vector_mt:normalize()
	local l = sqrt(self.x * self.x + self.y * self.y)
	if l > 0 then
		self.x = self.x / l
		self.y = self.y / l
	end
	return self
end

--- Change length of current vector to given value
-- @param len number - New length of current vector
-- @return Vector - reference to self
function vector_mt:setLength(len)
	local l = sqrt(self.x * self.x + self.y * self.y)
	if l > 0 then
		l = len / l
		self.x = self.x * l
		self.y = self.y * l
	end
	return self
end

--- Scale the current vectors length
-- @param scale number - factor to scale vector length with
-- @return Vector - reference to self
function vector_mt:scaleLength(scale)
	self.x = scale * self.x
	self.y = scale * self.y
	return self
end

--- Distance between vectors.
-- distance = (other - self):length()
-- @param other Vector
-- @return number - distance
-- @class function
-- @name Vector:distanceTo
function vector_mt:distanceTo(other)
	return sqrt((other.x - self.x)*(other.x - self.x)
		+ (other.y - self.y)*(other.y - self.y))
end

--- Calcualates dot product
-- @param other Vector
-- @return number - dot product
function vector_mt:dot(other)
	return self.x * other.x + self.y * other.y
end

--- Vector direction in radians
-- @return number - angle in interval [-pi, +pi]
function vector_mt:angle()
	return atan2(self.y, self.x);
end

--- Angle from current to other vector
-- @param other Vector
-- @return number - angle in interval [-pi, +pi]
function vector_mt:angleDiff(other)
	local geom = require "../base/geom"
	return geom.getAngleDiff(self:angle(), other:angle())
end

--- Absolute angle between current and other vector
-- @param other Vector
-- @return number - absolute angle in interval [0, +pi]
function vector_mt:absoluteAngleDiff(other)
	if self:length() == 0 or other:length() == 0 then
		return 0
	end
	return math.acos(math.bound(-1, self:dot(other) / (self:length() * other:length()), 1))
end

--- Perpendicular to current vector.
-- Returns perpendicular which is reached first when rotating clockwise.
-- Equals rotate(-math.pi/2)
-- @class function
-- @name Vector:perpendicular
-- @return Vector - perpendicular
function vector_mt:perpendicular()
	-- rotate by 90 degree ccw
	return vector_c(self.y, -self.x)
end

--- Rotate this vector.
-- Angles are oriented counterclockwise
-- @param angle number - angle in radians
-- @return Vector - this (rotated) vector
function vector_mt:rotate(angle)
	local xnew = cos(angle) * self.x - sin(angle) * self.y
	self.y = sin(angle) * self.x + cos(angle) * self.y
	self.x = xnew
	return self
end

--- Calculate orthogonalProjection on a given line.
-- The line is defined by linePoint1 and linePoint2.
-- Distance as seen from line when linePoint1 is on the left and linePoint2 on the right
-- @param linePoint1 Vector - point of line
-- @param linePoint2 Vector - point of line
-- @return Vector - projected point
-- @return number - distance to line
function vector_mt:orthogonalProjection(linePoint1, linePoint2)
	local geom = require "../base/geom"
	local rv = linePoint2 - linePoint1
	local is, dist = geom.intersectLineLine(self, rv:perpendicular(), linePoint1, rv)
	if is then
		return is, dist * rv:length()
	else
		return self, 0
	end
end

--- Distance value of orthogonalProjection
-- @see orthogonalProjection
-- @param linePoint1 Vector - point of line
-- @param linePoint2 Vector - point of line
-- @return number - distance to line
function vector_mt:orthogonalDistance(linePoint1, linePoint2)
	local _, dist = self:orthogonalProjection(linePoint1, linePoint2)
	return dist
end

--- Distance to given line segment.
-- Calculates distance from current vector to nearest point on line segment from lineStart to lineEnd
-- @class function
-- @name Vector:distanceToLineSegment
-- @param lineStart Vector - start of line
-- @param lineEnd Vector - end of line
-- @return number - distance
function vector_mt:distanceToLineSegment(lineStart, lineEnd)
    local dir = (lineEnd - lineStart):normalize()
    local d = self - lineStart
    if d:dot(dir) < 0 then
    	return d:length()
    end
    d = self - lineEnd
    if d:dot(dir) > 0 then
    	return d:length()
    end

    --local normal = dir:perpendicular()
    --return math.abs(d:dot(normal))
    return abs(d.x * dir.y - d.y * dir.x)
end

--- Calculates the point on a line segment with the shortest distance to a given point.
-- The distance between the line and the point equals the result of distanceToLineSegment
-- @param p Vector - any point
-- @param lineStart Vector - the start point of the line
-- @param lineEnd Vector - the end point of the line
function vector_mt:nearestPosOnLine(lineStart, lineEnd)
	local dir = (lineEnd - lineStart):normalize()
	if (self - lineStart):dot(dir) <= 0 then
		return lineStart
	elseif (self - lineEnd):dot(dir) >= 0 then
		return lineEnd
	end
	--the code below this line does the same as Vector.orthogonalProjection
	local d1, d2 = dir.x, dir.y
	local p1, p2 = lineStart.x, lineStart.y
	local a1, a2 = self.x, self.y
	local x1 = (d1*d1*a1 + d1*d2*(a2-p2) + d2*d2*p1)/(d1*d1 + d2*d2)
	local x2 = (d2*d2*a2 + d2*d1*(a1-p1) + d1*d1*p2)/(d2*d2 + d1*d1)
	return vector_c(x1, x2)
end

vector_c = ffi.metatype("Vector", mt) -- create type
vector_c_readonly = ffi.metatype("VectorReadOnly", mt)
Vector = {} -- static functions, publish to global namespace

--- Creates a new vector
-- @class function
-- @name Vector.create
-- @param x number - x coordinate
-- @param y number - y coordinate
-- @param [readOnly bool - readonly if true]
-- @return Vector
local function vector_create(x,y,readonly)
	if readonly then
		return vector_c_readonly(x,y)
	else
		return vector_c(x,y)
	end
end
Vector.create = vector_create

--- Creates a new read-only vector
-- @see Vector.create
-- @param x number - x coordinate
-- @param y number - y coordinate
-- @return Vector
function Vector.createReadOnly(x,y)
	return vector_c_readonly(x,y)
end

--- Create unit vector with given direction
-- @param angle number - Direction in radians
-- @return Vector
function Vector.fromAngle(angle)
	return vector_c(cos(angle), sin(angle))
end

local vector_class_mt = {
  	__call = function (_, x, y, readonly)
  		return vector_create(x, y, readonly)
  	end
}
setmetatable(Vector, vector_class_mt)

return Vector
