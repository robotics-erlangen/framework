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

return GoalTest
