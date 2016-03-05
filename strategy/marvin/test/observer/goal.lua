local GoalTest = {}

local debug = require "../base/debug"
local vis = require "../base/vis"
local World = require "../base/world"
local Goal = require "observer/goal"
local RobotList = require "util/robotlist"


function GoalTest.testFreeSectors()
	local freeSectors = Goal.freeSectors(World.Ball.pos, World.OpponentRobots, true)
	vis.setColor(vis.colors.orangeHalf, true)
	for _, s in ipairs(freeSectors) do
		--log(tostring(s[1]) .. " "..tostring(s[2]))
		local pointRight = World.Ball.pos + Vector.fromAngle(s[1])*10
		local pointLeft = World.Ball.pos + Vector.fromAngle(s[2])*10
		vis.addPolygon("test: Free Sectors", {World.Ball.pos, pointRight, pointLeft})
	end
end

function GoalTest.testCustomFreeSectors()
	local freeSectors = Goal.allFreeSectors(World.Ball.pos, World.OpponentRobots)
	for i,sector in ipairs(freeSectors) do
		debug.set("sector["..i.."]", "{"..sector[1]..", "..sector[2].."}")
	end
	vis.setColor(vis.colors.orangeHalf, true)
	for _, s in ipairs(freeSectors) do
		vis.addPizza("test: Custom Free Sectors", World.Ball.pos, 5, s[2], s[1])
	end
end

return GoalTest
