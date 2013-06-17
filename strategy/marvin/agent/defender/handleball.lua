local Base = require "agent/base/behaviour"
local HandleBall = (require "../base/class").new("Agent.Defender.HandleBall", Base)

local World = require "../base/world"
local Ball = require "observer/ball"
local Robot = require "observer/robot"
local Rating = require "util/rating"
local Referee = require "util/referee"

local ChipAway = require "task/chipaway"
local DirectPass = require "task/directpass"

function HandleBall:_check()
	local toBallScaling = 2 -- scale time to ball, to prefer attackers

	-- no main attacker if a play is manipulating the ball
	if self._trainerMessage.play then
		return false
	end
	
	-- we somehow got the ball
	local goodSituation1 = (self._robot == Ball.friendlyBallOwner()) and not Ball.opponentBallOwner() 
	
	local firstRobot, timeAdvance = Ball.firstAtBall()
	-- noone else is there to get the ball and we have enough time to play safely
	local goodSituation2 = self._robot == firstRobot and (timeAdvance >= Settings.defenseRiskLevel)

	local message = nil
	if (goodSituation1 or goodSituation2) and not Referee.isStopState() then -- apply for playing the ball
		local timeToBall = Robot.minTimeToBall(self._robot, World.Ball) * toBallScaling
		local mainAttackerRating = Rating.timeToRating(timeToBall)
		message = { specialTask = { mainAttacker = mainAttackerRating } }
	end

	local isMainAttacker = self._trainerMessage.specialTask.mainAttacker == self._robot
	return isMainAttacker and Base.State.Active or Base.State.Inactive, message
end

function HandleBall:_run()
	if not self._task then
		local bestRobot = nil
		local bestRating = -1
		for robot, msg in pairs(self._messages) do
			local rating = msg.task.assistantRating
			if rating and rating > bestRating and Robot.wayToRobotFree(robot, self._robot) then
				bestRobot = robot
				bestRating = rating
			end
		end
		self._pass = bestRobot
		if self._pass then
			self._task = DirectPass.create(self._robot, bestRobot, true)
		else -- under pressure
			self._task = ChipAway.create(self._robot)
		end
	end
end

return HandleBall
