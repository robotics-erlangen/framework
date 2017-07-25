local CommChallengeSlave = Class("Test.Move.CommChallengeSlave", require "group/move/base")

local World = require "../base/world"
local MoveToPos = require "task/movetopos"
local vis = require "../base/vis"
local Field = require "../base/field"

CommChallengeSlave.MIN_ROBOTS = 1
CommChallengeSlave.MAX_ROBOTS = 6

function CommChallengeSlave.canStart()
	return true
end

function CommChallengeSlave:_init()
end

function CommChallengeSlave:_canContinue()
	return true
end

local wayLength = 2.7 -- meters, only correct for official field
local function defAreaPos(robotId, opponentGoal)
	local pos = Field.defenseIntersectionByWay(wayLength*((robotId+1)/8), 0.23, opponentGoal)
	vis.addCircle("defAreaPos", pos, 0.1, vis.colors.orangeHalf, true)
	return pos
end

function CommChallengeSlave:_updateTasks()
	local taskAssignments = {}

	if World.MixedTeam then

		-- if World.RefereeState == "IndirectOffensive" then
		-- 		for robotId, msg in pairs(World.MixedTeam) do
		-- 			local robot = World.FriendlyRobotsById[robotId]
		-- 			if robot and robot.generation == 3 then
		-- 				if msg.shootPos then
		-- 					-- wenn ball noch nicht geschossen oder schnell:
		-- 					-- receivepass
		--
		-- 					-- wenn ball geschossen und langsam: shootgoal
		-- 				else
		-- 					taskAssignments[robot] =  { class = MoveToPos,
		-- 						params = {defAreaPos(robotId, false)}, restart = true }
		-- 				end
		-- 			end
		-- 		end
		-- end


		for robotId, msg in pairs(World.MixedTeam) do
			local robot = World.FriendlyRobotsById[robotId]
			if robot and robot.generation == 3 then
				local pos
				if msg.targetPos then
					pos = msg.targetPos
				else
					pos = defAreaPos(robotId, msg.role == "Offense")
				end

				taskAssignments[robot] =  { class = MoveToPos,
					params = {pos}, restart = true }
			end
		end
	end

	for _, robot in pairs(World.FriendlyRobots) do
		if World.RefereeState == "Stop" or not taskAssignments[robot] then
			local pos = Vector(
				-World.Geometry.FieldWidthHalf+1+robot.id*0.4,
				-0.7)
			taskAssignments[robot] = { class = MoveToPos, params = {pos}, restart=true }
		end
	end

	return taskAssignments
end

return CommChallengeSlave
