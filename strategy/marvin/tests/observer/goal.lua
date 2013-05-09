local GoalTest = {}

local Goal = require "observer/goal"
local World = require "../base/world"
local vis = require "../base/vis"

function GoalTest.testFreeSectors()
	local freeSectors = Goal.freeSectors(World.Ball.pos, World.OpponentRobots, true)
	vis.setColor(vis.colors.orangeHalf, true)
	for _, s in ipairs(freeSectors) do
		--log(tostring(s[1]) .. " "..tostring(s[2]))
		local pointRight = World.Ball.pos + Vector.fromAngle(s[1])*10
		local pointLeft = World.Ball.pos + Vector.fromAngle(s[2])*10
		vis.addPolygon("Free Sectors", {World.Ball.pos, pointRight, pointLeft})
	end
end

function GoalTest.testSearchFreeSectors()
	local s_right, a_right, s_left, a_left = Goal.searchFreeSectors({}, true)
	vis.setColor(vis.colors.turquoiseHalf, true)
	if #a_right == 2 then
		--log("Right: "..tostring(s_right).." Angles: "..tostring(a_right[1]).." to "..tostring(a_right[2]))
		local right_pointRight = s_right + Vector.fromAngle(a_right[1])*2
		local right_pointLeft = s_right + Vector.fromAngle(a_right[2])*2
		
		vis.addPolygon("Right from the Keeper", {s_right, right_pointRight, right_pointLeft})
	end
	if #a_left == 2 then
		--log("Left: "..tostring(s_left).." Angles: "..tostring(a_left[1]).." to "..tostring(a_left[2]))
		local left_pointRight = s_left + Vector.fromAngle(a_left[1])*2
		local left_pointLeft = s_left + Vector.fromAngle(a_left[2])*2
		
		vis.addPolygon("Left from the Keeper", {s_left, left_pointRight, left_pointLeft})
	end
	local keeper = World.OpponentKeeper
	if keeper then
		vis.addCircle("Opponent Keeper", keeper.pos, keeper.radius, vis.colors.pinkHalf, true)
	end
	
	local s_right, a_right, s_left, a_left = Goal.searchFreeSectors({}, false)
	vis.setColor(vis.colors.blueHalf, true)
	if #a_right == 2 then
		--log("Right: "..tostring(s_right).." Angles: "..tostring(a_right[1]).." to "..tostring(a_right[2]))
		local right_pointRight = s_right + Vector.fromAngle(a_right[1])*2
		local right_pointLeft = s_right + Vector.fromAngle(a_right[2])*2
		
		vis.addPolygon("Right from the Keeper", {s_right, right_pointRight, right_pointLeft})
	end
	if #a_left == 2 then
		--log("Left: "..tostring(s_left).." Angles: "..tostring(a_left[1]).." to "..tostring(a_left[2]))
		local left_pointRight = s_left + Vector.fromAngle(a_left[1])*2
		local left_pointLeft = s_left + Vector.fromAngle(a_left[2])*2
		
		vis.addPolygon("Left from the Keeper", {s_left, left_pointRight, left_pointLeft})
	end
	local keeper = World.FriendlyKeeper
	if keeper then
		vis.addCircle("Friendly Keeper", keeper.pos, keeper.radius, vis.colors.pinkHalf, true)
	end
end

return GoalTest
