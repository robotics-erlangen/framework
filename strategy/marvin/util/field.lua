local Field = {}

local World = require "../base/world"
local Referee = require "util/referee"
local G = World.Geometry


--- returns the nearest position inside the field (extended by boundaryWidth)
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
-- @param extraLimit number - how much the field should be additionally limited
-- @param pos Vector - the position to limit
-- @return Vector - limited vector
function Field.limitToAllowedField(pos, extraLimit, blockOpponentDefenseArea)
	extraLimit = extraLimit or 0
	local oppExtraLimit = extraLimit
	if Referee.isStopState() then
		oppExtraLimit = oppExtraLimit + World.Geometry.FreeKickDefenseDist
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

function Field.isInFriendlyDefenseArea(pos, radius)
	local G = World.Geometry
	if pos.y + radius < -G.FieldHeightHalf then
		return false
	end
	local p1 = Vector.create(G.DefenseStretch/2, -G.FieldHeightHalf) -- lower bound of defense stretch
	local p2 = Vector.create(-G.DefenseStretch/2, -G.FieldHeightHalf) -- upper bound of defense stretch

	if (math.abs(pos.x) < G.DefenseStretch/2 + radius and pos.y < G.DefenseRadius - G.FieldHeightHalf + radius) -- check if robot is inside defense stretch
			or p1:distanceTo(pos) < G.DefenseRadius + radius or p2:distanceTo(pos) < G.DefenseRadius + radius then -- check if robot is inside defense radius
		return true
	else
		return false
	end
end

function Field.isInOpponentDefenseArea(pos, radius)
	local G = World.Geometry
	local p1 = Vector.create(G.DefenseStretch/2, G.FieldHeightHalf) -- lower bound of defense stretch
	local p2 = Vector.create(-G.DefenseStretch/2, G.FieldHeightHalf) -- upper bound of defense stretch

	if (math.abs(pos.x) < G.DefenseStretch/2 + radius and pos.y > G.FieldHeightHalf - G.DefenseRadius - radius) -- check if robot is inside defense stretch
			or p1:distanceTo(pos) < G.DefenseRadius + radius or p2:distanceTo(pos) < G.DefenseRadius + radius then -- check if robot is inside defense radius
		return true
	else
		return false
	end
end

function Field.distanceToFriendlyDefenseArea(pos, radius)
	if pos.y + radius < -G.FieldHeightHalf then
		local distx = math.max(math.abs(pos.x) - radius - G.DefenseRadius - G.DefenseStretch/2, 0)
		local disty = -pos.y - radius - G.FieldHeightHalf
		return math.sqrt(distx^2, disty^2)
	end
	if Field.isInFriendlyDefenseArea(pos, radius) then
		return 0
	end
	local distance
	if math.abs(pos.x) < G.DefenseStretch/2 then
		distance = pos.y - (-G.FieldHeightHalf + G.DefenseRadius) - radius
	elseif pos.x > 0 then
		local p1 = Vector.create(G.DefenseStretch/2, -G.FieldHeightHalf)
		distance = p1:distanceTo(pos) - G.DefenseRadius - radius
	else
		local p2 = Vector.create(-G.DefenseStretch/2, -G.FieldHeightHalf)
		distance = p2:distanceTo(pos) - G.DefenseRadius - radius
	end
	if distance < 0 then
		error("util/field: distanceToFriendlyDefenseArea() becomes negative ("..distance..
			") for pos = ("..pos.x..", "..pos.y..") and radius = "..radius)
	end
	return distance
end

function Field.distanceToFriendlyGoalLine(pos, radius)
	if math.abs(pos.x) < G.GoalWidth/2 then
		return math.max(G.FieldHeightHalf + pos.y - radius, 0)
	end
	local goalpost = Vector.create(pos.x > 0 and G.GoalWidth/2 or - G.GoalWidth/2, -G.FieldHeightHalf)
	return goalpost:distanceTo(pos) - radius
end

function Field.isInOwnCorner(pos, opp)
	local oppfac = opp and 1 or -1
	return (World.Geometry.FieldWidthHalf - math.abs(World.Ball.pos.x))^2
		+ (oppfac * World.Geometry.FieldHeightHalf - World.Ball.pos.y)^2 < 1
end
	


return Field
