local GoalTest = {}

local Goal = require "observer/goal"
local World = require "../base/world"
local vis = require "../base/vis"
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
	if #World.FriendlyRobots < 2 then
		log("Needs at least two friendly robots")
		return
	end

	local startAngle = (World.FriendlyRobots[1].pos - World.Ball.pos):angle()
	local endAngle = (World.FriendlyRobots[2].pos - World.Ball.pos):angle()
	local freeSectors = Goal.getFreeSectors(World.Ball.pos, World.OpponentRobots, startAngle, endAngle)
	vis.setColor(vis.colors.orangeHalf, true)
	for _, s in ipairs(freeSectors) do
		--log(tostring(s[1]) .. " "..tostring(s[2]))
		local pointRight = World.Ball.pos + Vector.fromAngle(s[1])*10
		local pointLeft = World.Ball.pos + Vector.fromAngle(s[2])*10
		vis.addPolygon("test: Custom Free Sectors", {World.Ball.pos, pointRight, pointLeft})
	end
end

return GoalTest
