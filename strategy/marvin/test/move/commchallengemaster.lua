local CommChallengeMaster = Class("Test.Move.CommChallengeMaster", require "group/move/base")

local World = require "../base/world"
local Field = require "../base/field"
local MoveToPos = require "task/movetopos"
local vis = require "../base/vis"
local mixedteam = require "../base/mixedteam"

CommChallengeMaster.MIN_ROBOTS = 3
CommChallengeMaster.MAX_ROBOTS = 6

function CommChallengeMaster.canStart()
	return true
end

function CommChallengeMaster:_init()

end

function CommChallengeMaster:_canContinue()
	return true
end

local wayLength = 2.7 -- meters, only correct for official field
local function defAreaPos(num, opponentGoal)
	local pos = Field.defenseIntersectionByWay(wayLength*((num+1)/8), 0.23, opponentGoal)
	vis.addCircle("defAreaPos", pos, 0.1, vis.colors.orangeHalf, true)
	-- return position at defense area, determined by robot id
	return pos
end

local function task1()
	local taskAssignments = {}
	local partnerPlan = {}

	-- alle eigenen hinter, alle gegnerischen vor
	for id, robot in pairs(World.FriendlyRobotsById) do
		if robot == World.FriendlyRobot then
			partnerPlan[id] = { targetPos = World.Geometry.FriendlyGoal, role = "Goalie" }
		elseif robot.generation == 2 then -- ally
			partnerPlan[id] = { targetPos = defAreaPos(id, true), role = "Offense" }
		else -- own robot
			local pos = defAreaPos(id, false)
			partnerPlan[id] = { targetPos = pos, role = "Defense" }
			taskAssignments[robot] =  { class = MoveToPos, params = {pos}, restart = true }
		end
	end

	mixedteam.sendInfo(partnerPlan)
	return taskAssignments
end

local function task2()
	local taskAssignments = {}
	local partnerPlan = {}

	-- alle hinter
	for id, robot in pairs(World.FriendlyRobotsById) do
		if robot == World.FriendlyRobot then
			partnerPlan[id] = { targetPos = World.Geometry.FriendlyGoal, role = "Goalie" }
		elseif robot.generation == 2 then -- ally
			partnerPlan[id] = { targetPos = defAreaPos(id, false), role = "Defense" }
		else -- own robot
			local pos = defAreaPos(id, false)
			partnerPlan[id] = { targetPos = pos, role = "Defense" }
			taskAssignments[robot] =  { class = MoveToPos, params = {pos} }
		end
	end

	mixedteam.sendInfo(partnerPlan)
	return taskAssignments

end


local passKicker
local passReceiver
local function task3()
	local taskAssignments = {}
	local partnerPlan = {}

	if World.RefereeState ~= "IndirectOffensive" then
		passKicker = nil
		passReceiver = nil
		return {}
	end

	if not passKicker then
		-- naehester eigener um pass zu spielen

		-- vorderster partner um pass anzunehmen
	end




	for id, robot in pairs(World.FriendlyRobotsById) do
		if robot == World.FriendlyRobot then
			partnerPlan[id] = { targetPos = World.Geometry.FriendlyGoal, role = "Goalie" }
		elseif robot.generation == 2 then -- ally



			-- pass partner auswaehlen
			partnerPlan[id] = { targetPos = defAreaPos(id, false), role = "Defense" }
		else -- own robot


			local pos = defAreaPos(id, false)
			partnerPlan[id] = { targetPos = pos, role = "Defense" }
			taskAssignments[robot] =  { class = MoveToPos, params = {pos}, restart=true }
		end
	end

	mixedteam.sendInfo(partnerPlan)
	return taskAssignments
end

local function stopPositions()
	local taskAssignments = {}
	for _, robot in pairs(World.FriendlyRobots) do
		if robot.generation == 3 then
			local pos = Vector(
				-World.Geometry.FieldWidthHalf+1+robot.id*0.4,
				-0.7)
			taskAssignments[robot] = { class = MoveToPos, params = {pos}, restart=true }
		end
	end
	return taskAssignments
end

function CommChallengeMaster:_updateTasks()

	if World.RefereeState == "Stop" then
		return stopPositions()
	elseif World.RefereeState == "GameForce" then
		return task1()
	elseif World.RefereeState == "IndirectDefensive" then
		return task2()
	elseif World.RefereeState == "IndirectOffensive" then
		return task3()
	end

	return {}
end

return CommChallengeMaster
