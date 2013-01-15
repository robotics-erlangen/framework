local World = require "../base/world"
local Field = {}

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
-- @param boundaryWidth number - how much the field should be extended beyond the borders
-- @param pos Vector - the position to limit
-- @return Vector - limited vector
function Field.limitToAllowedField(pos, boundaryWidth)
	local limitedPos = pos
	boundaryWidth = boundaryWidth or 0
	
	if Field.isInFriendlyDefenseArea(pos, boundaryWidth) then
		if math.abs(pos.x) <= World.Geometry.DefenseStretch/2 then
			limitedPos = Vector.create(pos.x, -World.Geometry.FieldHeightHalf+World.Geometry.DefenseRadius+boundaryWidth)
		else
			local circleMidpoint = Vector.create(
				World.Geometry.DefenseStretch/2 * pos.x/math.abs(pos.x),-World.Geometry.FieldHeightHalf)
			limitedPos = circleMidpoint + (pos - circleMidpoint):setLength(World.Geometry.DefenseRadius+boundaryWidth)
		end
	end
	
	return limitedPos
end

--- check if pos is inside the field (extended by boundaryWidth)
-- @param pos Vector - the position to limit
-- @param boundaryWidth number - how much the field should be extended beyond the borders
-- @return bool - is in field
function Field.isInField(pos, boundaryWidth)
	boundaryWidth = boundaryWidth or 0

	local allowedHeight = World.Geometry.FieldHeightHalf + extra -- limit height to field
	if math.abs(pos.x) > World.Geometry.GoalWidth / 2 and math.abs(pos.y) > allowedHeight -- check whether robot is inside the goal
			or math.abs(pos.y) > allowedHeight + World.Geometry.GoalDepth then -- handle area behind goal
		return false
	end

	local allowedWidth = World.Geometry.FieldWidthHalf + extra -- limit width to field
	if math.abs(pos.x) > allowedWidth then
		return false
	end

	return true
end

function Field.isInFriendlyDefenseArea(pos, radius)
	local G = World.Geometry
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

return Field
