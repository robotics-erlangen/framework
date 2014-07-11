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

function GoalTest.testSearchFreeSectors()
	local keeper = World.OpponentKeeper
	local rlist = Goal.getRobotsNearGoal(2, World.Robots, true)
	if keeper then
		vis.addCircle("test: Opponent Keeper", keeper.pos, keeper.radius, vis.colors.pinkHalf, true)
		RobotList.excludeRobot(rlist, keeper)
	end
	local s_right, a_right, s_left, a_left = Goal.searchFreeSectors(rlist, true)
	vis.setColor(vis.colors.turquoiseHalf, true)
	if #a_right >= 1 then
		--local str = "Right: "..tostring(s_right).." Angles:"
		for _, a in ipairs(a_right) do
			--str = str.." "..tostring(a[1]).." to "..tostring(a[2])..","
			local right_pointRight = s_right + Vector.fromAngle(a[1])*2
			local right_pointLeft = s_right + Vector.fromAngle(a[2])*2
			vis.addPolygon("test: Right from the Keeper", {s_right, right_pointRight, right_pointLeft})
		end
		--log(str)
	end
	--log(tostring(a_left))
	if #a_left >= 1 then
		for _, a in ipairs(a_left) do
			--log(tostring(a))
			--log("Left: "..tostring(s_left).." Angles: "..tostring(a[1]).." to "..tostring(a[2]))
			local left_pointRight = s_left + Vector.fromAngle(a[1])*2
			local left_pointLeft = s_left + Vector.fromAngle(a[2])*2
			vis.addPolygon("test: Left from the Keeper", {s_left, left_pointRight, left_pointLeft})
		end
	end
	
	local keeper = World.FriendlyKeeper
	rlist = Goal.getRobotsNearGoal(2, World.Robots, false)
	if keeper then
		vis.addCircle("test: Friendly Keeper", keeper.pos, keeper.radius, vis.colors.pinkHalf, true)
		RobotList.excludeRobot(rlist, keeper)
	end
	local s_right, a_right, s_left, a_left = Goal.searchFreeSectors(rlist, false)
	vis.setColor(vis.colors.blueHalf, true)
	if #a_right >= 1 then
		for _, a in ipairs(a_right) do
			--log("Right: "..tostring(s_right).." Angles: "..tostring(a[1]).." to "..tostring(a[2]))
			local right_pointRight = s_right + Vector.fromAngle(a[1])*2
			local right_pointLeft = s_right + Vector.fromAngle(a[2])*2
			vis.addPolygon("test: Right from the Keeper", {s_right, right_pointRight, right_pointLeft})
		end
	end
	if #a_left >= 1 then
		for _, a in ipairs(a_left) do
			--log("Left: "..tostring(s_left).." Angles: "..tostring(a[1]).." to "..tostring(a[2]))
			local left_pointRight = s_left + Vector.fromAngle(a[1])*2
			local left_pointLeft = s_left + Vector.fromAngle(a[2])*2
			vis.addPolygon("test: Left from the Keeper", {s_left, left_pointRight, left_pointLeft})
		end
	end
end

return GoalTest
