--[[
--- Some field related utility functions
module "Field"
]]--

--[[***********************************************************************
*   Copyright 2014 Alexander Danzer, Michael Eischer, Christian Lobmeier, *
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
*************************************************************************]]

local Field = {}

local World = require "../base/world"
local Referee = require "../base/referee"
local G = World.Geometry
local geom = require "../base/geom"
local math = require "../base/math"


--- returns the nearest position inside the field (extended by boundaryWidth)
-- @name limitToField
-- @param pos Vector - the position to limit
-- @param boundaryWidth number - how much the field should be extended beyond the borders
-- @return Vector - limited vector
function Field.limitToField(pos, boundaryWidth)
	boundaryWidth = boundaryWidth or 0

	local allowedHeight = World.Geometry.FieldHeightHalf + boundaryWidth -- limit height to field
	local y = math.bound(-allowedHeight, pos.y, allowedHeight)

	local allowedWidth = World.Geometry.FieldWidthHalf + boundaryWidth -- limit width to field
	local x = math.bound(-allowedWidth, pos.x, allowedWidth)

	return Vector.create(x, y)
end

--- returns the nearest position inside the field without friendly defense area
-- @name limitToAllowedField
-- @param extraLimit number - how much the field should be additionally limited
-- @param pos Vector - the position to limit
-- @return Vector - limited vector
function Field.limitToAllowedField(pos, extraLimit, blockOpponentDefenseArea)
	extraLimit = extraLimit or 0
	local oppExtraLimit = extraLimit
	if Referee.isStopState() then
		oppExtraLimit = oppExtraLimit + World.Geometry.FreeKickDefenseDist + 0.10
	end
	if Field.isInFriendlyDefenseArea(pos, extraLimit) then
		if math.abs(pos.x) <= World.Geometry.DefenseStretch/2 then
			pos = Vector.create(pos.x, -World.Geometry.FieldHeightHalf+World.Geometry.DefenseRadius+extraLimit)
		else
			local circleMidpoint = Vector.create(
				World.Geometry.DefenseStretch/2*math.sign(pos.x), -World.Geometry.FieldHeightHalf)
			pos = circleMidpoint + (pos - circleMidpoint):setLength(World.Geometry.DefenseRadius+extraLimit)
		end
		return pos
	elseif blockOpponentDefenseArea and Field.isInOpponentDefenseArea(pos, oppExtraLimit) then
		if math.abs(pos.x) <= World.Geometry.DefenseStretch/2 then
			pos = Vector.create(pos.x, World.Geometry.FieldHeightHalf-World.Geometry.DefenseRadius-oppExtraLimit)
		else
			local circleMidpoint = Vector.create(
				World.Geometry.DefenseStretch/2*math.sign(pos.x), World.Geometry.FieldHeightHalf)
			pos = circleMidpoint + (pos - circleMidpoint):setLength(World.Geometry.DefenseRadius+oppExtraLimit)
		end
		return pos
	else
		return Field.limitToField(pos)
	end
end

--- check if pos is inside the field (extended by boundaryWidth)
-- @name isInField
-- @param pos Vector - the position to limit
-- @param boundaryWidth number - how much the field should be extended beyond the borders
-- @return bool - is in field
function Field.isInField(pos, boundaryWidth)
	boundaryWidth = boundaryWidth or 0

	local allowedHeight = World.Geometry.FieldHeightHalf + boundaryWidth -- limit height to field
	if math.abs(pos.x) > World.Geometry.GoalWidth / 2 and math.abs(pos.y) > allowedHeight -- check whether robot is inside the goal
			or math.abs(pos.y) > allowedHeight + World.Geometry.GoalDepth then -- handle area behind goal
		return false
	end

	local allowedWidth = World.Geometry.FieldWidthHalf + boundaryWidth -- limit width to field
	if math.abs(pos.x) > allowedWidth then
		return false
	end

	return true
end


--- Returns the minimum distance to the field borders (extended by boundaryWidth)
-- @name distanceToFieldBorders
-- @param pos Vector - the position to limit
-- @param boundaryWidth number - how much the field should be extended beyond the borders
-- @return number - distance to field borders
function Field.distanceToFieldBorder(pos, boundaryWidth)
	boundaryWidth = boundaryWidth or 0

	local allowedWidth = World.Geometry.FieldWidthHalf + boundaryWidth
	local dx = allowedWidth - math.abs(pos.x)

	local allowedHeight = World.Geometry.FieldHeightHalf + boundaryWidth
	local dy = allowedHeight - math.abs(pos.y)

	-- returns the minimum of dx and dy
	return math.bound(0, dx, dy)
end



local defStretchHalf = G.DefenseStretch / 2
local defRadius = G.DefenseRadius
local function isInDefenseArea(pos, radius, friendly)
	local goalLine = G.FieldHeightHalf
	if friendly then
		goalLine = -G.FieldHeightHalf
	end

	if (friendly and pos.y + radius < goalLine)	or (not friendly and pos.y + radius > goalLine) then
		return false
	end

	local p1 = Vector.create(defStretchHalf, goalLine) -- lower bound of defense stretch
	local p2 = Vector.create(-defStretchHalf, goalLine) -- upper bound of defense stretch
	local belowDefStretch = pos.y > goalLine - defRadius - radius
	if friendly then
		belowDefStretch = pos.y < goalLine + defRadius + radius
	end

	return (math.abs(pos.x) < defStretchHalf + radius and belowDefStretch) -- if robot is inside defense stretch
		or p1:distanceTo(pos) < defRadius + radius or p2:distanceTo(pos) < defRadius + radius -- if robot is inside defense radius
end

--- Returns true if the position is inside/touching the friendly defense area
-- @name isInFriendlyDefenseArea
-- @param pos Vector - the position to check
-- @param radius number - Radius of object to check
-- @return bool
function Field.isInFriendlyDefenseArea(pos, radius)
	return isInDefenseArea(pos, radius, true)
end

--- Returns true if the position is inside/touching the opponent defense area
-- @name isInOpponentDefenseArea
-- @param pos Vector - the position to check
-- @param radius number - Radius of object to check
-- @return bool
function Field.isInOpponentDefenseArea(pos, radius)
	return isInDefenseArea(pos, radius, false)
end

local function distanceToDefenseArea(pos, radius, friendly)
	local goalLine = G.FieldHeightHalf
	if friendly then
		goalLine = - G.FieldHeightHalf
	end
	if friendly and pos.y + radius < goalLine then
		local distx = math.max(math.abs(pos.x) - radius - defRadius - defStretchHalf, 0)
		local disty = goalLine - pos.y - radius
		return math.sqrt(distx^2, disty^2)
	elseif not friendly and pos.y + radius > G.FieldHeightHalf then
		local distx = math.max(math.abs(pos.x) - radius - defRadius - defStretchHalf, 0)
		local disty = pos.y + radius - goalLine
		return math.sqrt(distx^2, disty^2)
	end
	if isInDefenseArea(pos, radius, friendly) then
		return 0
	end
	local distance
	if math.abs(pos.x) <= defStretchHalf then
		if friendly then
			distance = pos.y - (goalLine + defRadius) - radius
		else
			distance = goalLine - defRadius - pos.y + radius
		end
	elseif pos.x > defStretchHalf then
		local corner = Vector.create(defStretchHalf, goalLine)
		distance = corner:distanceTo(pos) - defRadius - radius
	else -- pos.x < -defStretchHalf
		local corner = Vector.create(-defStretchHalf, goalLine)
		distance = corner:distanceTo(pos) - defRadius - radius
	end
	if distance < -0.00001 then
		error("base/field: distanceToFriendlyDefenseArea() becomes negative ("..distance..
			") for pos = ("..pos.x..", "..pos.y..") and radius = "..radius)
	end
	return (distance < 0) and 0 or distance
end

--- Calculates the distance (between robot hull and field line) to the friendly defense area
-- @name distanceToFriendlyDefenseArea
-- @param pos Vector - the position to check
-- @param radius number - Radius of object to check
-- @return number - distance
function Field.distanceToFriendlyDefenseArea(pos, radius)
	return distanceToDefenseArea(pos, radius, true)
end

--- Calculates the distance (between robot hull and field line) to the opponent defense area
-- @name distanceToOpponentDefenseArea
-- @param pos Vector - the position to check
-- @param radius number - Radius of object to check
-- @return number - distance
function Field.distanceToOpponentDefenseArea(pos, radius)
	return distanceToDefenseArea(pos, radius, false)
end

local normalize = function(angle)
	while angle >= 2*math.pi do angle = angle - 2*math.pi end
	while angle < 0 do angle = angle + 2*math.pi end
	return angle
end

local isInInterval = function(angle, min, max)
	return normalize(angle - min) <= normalize(max - min)
end

local intersectLineArc = function(pos, dir, m, r, minangle, maxangle)
	local intersections = {}
	local i1, i2 = geom.intersectLineCircle(pos, dir, m, r)
	local interval = normalize(maxangle - minangle)
	if i1 then
		local a1 = normalize((i1 - m):angle() - minangle)
		if a1 < interval then
			table.insert(intersections, {i1, a1})
		end
	end
	if i2 then
		local a2 = normalize((i2 - m):angle() - minangle)
		if a2 < interval then
			table.insert(intersections, {i2, a2})
		end
	end
	return intersections
end

--- Returns one intersection of a given line with the (extended) defense area
--- The intersection is the one with the smallest t in x = pos + t * dir
-- @name intersectLineDefenseArea
-- @param pos Vector - starting point of the line
-- @param dir Vector - the direction of the line
-- @param extraDistance number - gets added to G.DefenseRadius
-- @param opp bool - whether the opponent or the friendly defense area is considered
-- @return Vector - the intersection position
-- @return number - the length of the way from the very left of the defense area to the
-- intersection point, when moving along its border
function Field.intersectLineDefenseArea(pos, dir, extraDistance, opp)
	-- calculate defense radius
	extraDistance = extraDistance or 0
	local radius = G.DefenseRadius + extraDistance
	assert(radius >= 0, "extraDistance must not be smaller than -G.DefenseRadius")

	-- calculate length of defense border (arc - line - arc)
	local arcway = radius * math.pi/2
	local lineway = G.DefenseStretch
	local totalway = 2 * arcway + lineway

	-- calculate global positions
	local oppfac = opp and -1 or 1
	local leftCenter = Vector.create(-G.DefenseStretch/2, -G.FieldHeightHalf) * oppfac
	local rightCenter = Vector.create(G.DefenseStretch/2, -G.FieldHeightHalf) * oppfac
	local leftLine = Vector.create(-G.DefenseStretch/2, -G.FieldHeightHalf + radius) * oppfac
	local rightLine = Vector.create(G.DefenseStretch/2, -G.FieldHeightHalf + radius) * oppfac

	-- calclulate global angles
	local oppadd = opp and math.pi or 0
	local to_opponent = normalize(oppadd + math.pi/2)
	local to_friendly = normalize(oppadd - math.pi/2)

	-- calctulate intersection points with defense arcs
	local intersections = {}
	local ileft = intersectLineArc(pos, dir, leftCenter, radius, to_opponent, to_friendly)
	for _,i in ipairs(ileft) do
		table.insert(intersections, {i[1], (math.pi/2-i[2]) * radius})
	end
	local iright = intersectLineArc(pos, dir, rightCenter, radius, to_friendly, to_opponent)
	for _,i in ipairs(iright) do
		table.insert(intersections, {i[1], (math.pi-i[2]) * radius + arcway + lineway})
	end

	-- calculate intersection point with defense stretch
	local defenseLineOnpoint = Vector.create(0, -G.FieldHeightHalf + radius) * oppfac
	local lineIntersection,_,l2 = geom.intersectLineLine(pos, dir, defenseLineOnpoint, Vector.create(1,0))
	if lineIntersection and math.abs(l2) <= G.DefenseStretch/2 then
		table.insert(intersections, {lineIntersection, l2 + totalway/2})
	end

	-- choose nearest intersection
	local minDistance = math.huge
	local minIntersection = nil
	local minWay = totalway/2
	for _,i in ipairs(intersections) do
		local dist = pos:distanceTo(i[1])
		if dist < minDistance then
			minDistance = dist
			minIntersection = i[1]
			minWay = i[2]
		end
	end

	return minIntersection, minWay
end

--- Calculates the point on the (extended) defense area when given the way along its border
-- @name defenseIntersectionByWay
-- @param way number - the way along the border
-- @param extraDistance number - gets added to G.DefenseRadius
-- @param opp bool - whether the opponent or the friendly defense area is considered
-- @return Vector - the position
function Field.defenseIntersectionByWay(way, extraDistance, opp)
	-- calculate defense radius
	extraDistance = extraDistance or 0
	local radius = G.DefenseRadius + extraDistance
	assert(radius >= 0, "extraDistance must not be smaller than -G.DefenseRadius")

	-- calculate length of defense border (arc - line - arc)
	local arcway = radius * math.pi/2
	local lineway = G.DefenseStretch
	local totalway = 2 * arcway + lineway
	assert(way >= -arcway and way <= totalway + arcway, "way is out of bounds")

	local intersection = nil
	if way < arcway then
		local angle = way / radius
		intersection = Vector.fromAngle(math.pi - angle) * radius +
			Vector.create(-G.DefenseStretch/2, -G.FieldHeightHalf)
	elseif way <= arcway + lineway then
		intersection = Vector.create(way - arcway - G.DefenseStretch/2, radius - G.FieldHeightHalf)
	else
		local angle = (way - arcway - lineway) / radius
		intersection = Vector.fromAngle(math.pi/2 - angle) * radius +
			Vector.create(G.DefenseStretch/2, -G.FieldHeightHalf)
	end

	if opp then
		intersection = -intersection
	end

	return intersection
end

--- Calculates all intersections (0 to 4) of a given circle with the (extended) defense area
-- @name intersectCircleDefenseArea
-- @param pos Vector - center point of the circle
-- @param radius number - radius of the circle
-- @param extraDistance number - gets added to G.DefenseRadius
-- @param opp bool - whether the opponent or the friendly defense area is considered
-- @return [Vector] - a list of intersection points, not sorted
function Field.intersectCircleDefenseArea(pos, radius, extraDistance, opp)
	-- invert coordinates if opp-flag is set
	if opp then pos = pos * -1 end

	local leftCenter = Vector.create(-G.DefenseStretch/2, -G.FieldHeightHalf)
	local rightCenter = Vector.create(G.DefenseStretch/2, -G.FieldHeightHalf)
	local defenseRadius = G.DefenseRadius + extraDistance

	local intersections = {}

	-- get intersections with circles
	local li1, li2 = geom.intersectCircleCircle(leftCenter, defenseRadius, pos, radius)
	local ri1, ri2 = geom.intersectCircleCircle(rightCenter, defenseRadius, pos, radius)
	if li1 and li1.x < G.DefenseStretch/2 and li1.y > -G.FieldHeightHalf then
		table.insert(intersections, li1)
	end
	if li2 and li2.x < G.DefenseStretch/2 and li2.y > -G.FieldHeightHalf then
		table.insert(intersections, li2)
	end
	if ri1 and ri1.x > G.DefenseStretch/2 and ri1.y > -G.FieldHeightHalf then
		table.insert(intersections, ri1)
	end
	if ri2 and ri2.x > G.DefenseStretch/2 and ri2.y > -G.FieldHeightHalf then
		table.insert(intersections, ri2)
	end

	-- get intersections with line
	local mi1, mi2 = geom.intersectLineCircle(
				Vector.create(0, -G.FieldHeightHalf+defenseRadius), Vector.create(1, 0), pos, radius)
	if mi1 and math.abs(mi1.x) <= G.DefenseStretch/2 then
		table.insert(intersections, li1)
	end
	if mi2 and math.abs(mi1.x) <= G.DefenseStretch/2 then
		table.insert(intersections, li2)
	end


	-- invert coordinates if opp-flag is set
	if opp then
		for i, pos in ipairs(intersections) do
			intersections[i] = pos * -1
		end
	end

	return intersections
end

--- Calculates the distance (between robot hull and field line) to the own goal line
-- @name distanceToFriendlyGoalLine
-- @param pos Vector - the position to check
-- @param radius number - Radius of object to check
-- @return number - distance
function Field.distanceToFriendlyGoalLine(pos, radius)
	if math.abs(pos.x) < G.GoalWidth/2 then
		return math.max(G.FieldHeightHalf + pos.y - radius, 0)
	end
	local goalpost = Vector.create(pos.x > 0 and G.GoalWidth/2 or - G.GoalWidth/2, -G.FieldHeightHalf)
	return goalpost:distanceTo(pos) - radius
end

--- Check whether to position is in the teams own corner
-- @name isInOwnCorner
-- @param pos Vector - the position to check
-- @param opp bool - Do the check from the opponents point of view
-- @return bool
function Field.isInOwnCorner(pos, opp)
	local oppfac = opp and 1 or -1
	return (World.Geometry.FieldWidthHalf - math.abs(World.Ball.pos.x))^2
		+ (oppfac * World.Geometry.FieldHeightHalf - World.Ball.pos.y)^2 < 1
end

--- The position, where the half-line given by startPos and dir intersects the next field boundary
-- @param startPos vector - the initial point of the half-line
-- @param dir vector - the direction of the half-line
-- @return [vector]
function Field.nextLineCut(startPos, dir)
	if dir.x == 0 and dir.y == 0 then
		return
	end
	local width = Vector.create(G.FieldWidthHalf*math.sign(dir.x), 0)
	local height = Vector.create(0, G.FieldHeightHalf*math.sign(dir.y))
	local sideCut, sideLambda = geom.intersectLineLine(startPos, dir, width, height)
	local frontCut, frontLambda = geom.intersectLineLine(startPos, dir, height, width)
	if sideCut then
		if frontCut then
			if sideLambda < frontLambda then
				return sideCut
			else
				return frontCut
			end
		else
			return sideCut
		end
	else
		return frontCut
	end
end


return Field
