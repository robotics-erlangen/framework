local CommChallengeSlave = Class("Test.Move.CommChallengeSlave", require "group/move/base")

local World = require "../base/world"
local MoveToPos = require "task/movetopos"
local vis = require "../base/vis"
local Field = require "../base/field"
local Ball = require "observer/ball"
local ShootGoal = require "task/shootgoal"

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
	local pos = Field.defenseIntersectionByWay(wayLength*((robotId+1)/8), 0.23, not opponentGoal)
	vis.addCircle("defAreaPos", pos, 0.1, vis.colors.orangeHalf, true)
	return pos
end

local ballWasShot = false
local passReceiver = nil
function CommChallengeSlave:_updateTasks()
	local taskAssignments = {}

	if World.RefereeState == "Stop" then
		ballWasShot = false
		passReceiver = nil
	end

	if Ball.isShot() then
		ballWasShot = true
	end

	if World.MixedTeam then


		for robotId, msg in pairs(World.MixedTeam) do
			local robot = World.FriendlyRobotsById[robotId]
			if robot and robot.generation == robot.GENERATION_2014_ID then
				local pos
				if msg.shootPos then
					passReceiver = robot
					log(robot.id)
				end
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

	if ballWasShot and passReceiver then
		taskAssignments[passReceiver] = { class = ShootGoal }
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
