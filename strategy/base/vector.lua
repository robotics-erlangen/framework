--[[
--- 2D Vector class.
-- Supports + - * / ==
module "Vector"
]]--

--[[***********************************************************************
*   Copyright 2014 Michael Eischer                                        *
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

require "vector"

--- Creates a new vector
-- @class function
-- @name Vector.create
-- @param x number - x coordinate
-- @param y number - y coordinate
-- @param [readOnly bool - readonly if true]
-- @return Vector

--[[
separator for luadoc]]--

--- Creates a copy of the current vector.
-- Doesn't copy read-only flag
-- @return Vector - copy
-- @class function
-- @name Vector:copy

--[[
separator for luadoc]]--

--- Creates a new read-only vector
-- @see Vector.create
-- @param x number - x coordinate
-- @param y number - y coordinate
-- @return Vector
function Vector.createReadOnly(x,y)
	return Vector.create(x,y,true)
end


--- Checks for invalid vector
-- @return bool - True if a coordinate is NaN
function Vector:isNan()
	return (self.x ~= self.x) or (self.y ~= self.y)
end

--- Get vector length
-- @class function
-- @name Vector:length
-- @return number - length

--[[
separator for luadoc]]--

--- Get squared vector length
-- @return number - squared length
function Vector:lengthSq()
	return self.x * self.x + self.y * self.y
end

--- Normalizes current vector.
-- A normalized vector has the length 1.
-- Null vector won't be modified
-- @class function
-- @name Vector:normalize
-- @return Vector - reference to self

--[[
separator for luadoc]]--

--- Change length of current vector to given value
-- @param len number - New length of current vector
-- @return Vector - reference to self
function Vector:setLength(len)
	self:normalize()
	self.x = self.x * len
	self.y = self.y * len
	return self
end

--- Scale the current vectors length
-- @param scale number - factor to scale vector length with
-- @return Vector - reference to self
function Vector:scaleLength(scale)
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

--[[
separator for luadoc]]--
if not Vector.distanceTo then
	error("Your version of Amun-Ra is outdated!")
end


--- Calcualates dot product
-- @param other Vector
-- @return number - dot product
function Vector:dot(other)
	return self.x * other.x + self.y * other.y
end

--- Vector direction in radians
-- @return number - angle in interval [-pi, +pi]
function Vector:angle()
	return math.atan2(self.y, self.x);
end

--- Create unit vector with given direction
-- @param angle number - Direction in radians
-- @return Vector
function Vector.fromAngle(angle)
	return Vector.create(math.cos(angle), math.sin(angle))
end

--- Angle from current to other vector
-- @param other Vector
-- @return number - angle in interval [-pi, +pi]
function Vector:angleDiff(other)
	local geom = require "../base/geom"
	return geom.getAngleDiff(self:angle(), other:angle())
end

--- Absolute angle between current and other vector
-- @param other Vector
-- @return number - absolute angle in interval [0, +pi]
function Vector:absoluteAngleDiff(other)
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

--[[
separator for luadoc]]--

--- Rotate this vector.
-- Angles are oriented counterclockwise
-- @param angle number - angle in radians
-- @return Vector - this (rotated) vector
function Vector:rotate(angle)
	local xnew = math.cos(angle) * self.x - math.sin(angle) * self.y
	self.y = math.sin(angle) * self.x + math.cos(angle) * self.y
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
function Vector:orthogonalProjection(linePoint1, linePoint2)
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
function Vector:orthogonalDistance(linePoint1, linePoint2)
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

--[[
separator for luadoc]]--

--- Calculates the point on a line segment with the shortest distance to a given point.
-- The distance between the line and the point equals the result of distanceToLineSegment
-- @param p Vector - any point
-- @param lineStart Vector - the start point of the line
-- @param lineEnd Vector - the end point of the line
function Vector:nearestPosOnLine(lineStart, lineEnd)
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
	return Vector.create(x1, x2)
end
