local Base = require "agent/base/behaviour"
local HandleBall = (require "../base/class").new("Agent.Defender.HandleBall", Base)

local World = require "../base/world"
local Ball = require "observer/ball"
local Robot = require "observer/robot"
local Rating = require "util/rating"
local Referee = require "util/referee"
local Shoot = require "observer/shoot"

local ChipAway = require "task/chipaway"
local DirectPass = require "task/directpass"

function HandleBall:_stop()
	self._timeAdvance = 0
end

function HandleBall:_check()
	local toBallScaling = 2 -- scale time to ball, to prefer attackers

	-- no main attacker if a play is manipulating the ball
	if self._trainerMessage.play then
		return false
	end
	
	-- we somehow got the ball
	local goodSituation1 = (self._robot == Ball.friendlyBallOwner()) and not Ball.opponentBallOwner() 
	
	-- we are the first at ball
	local firstRobot
	firstRobot, self._timeAdvance = Ball.firstAtBall()
	local goodSituation2 = self._robot == firstRobot

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
		local bestAssi = Shoot.bestFreeAssistant(self._robot, self._messages)
		if bestAssi and self._timeAdvance > Settings.defenseRiskLevel then
			self._task = DirectPass.create(self._robot, bestAssi, true)
		else -- under pressure
			self._task = ChipAway.create(self._robot)
		end
	end
end

return HandleBall
