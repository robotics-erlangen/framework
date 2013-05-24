local Base = require "agent/base/behaviour"
local HandleBall = (require "../base/class").new("Agent.Defender.HandleBall", Base)

local World = require "../base/world"
local Ball = require "observer/ball"

local ChipAway = require "task/chipaway"
local DirectPass = require "task/directpass"

function HandleBall:_check()
	-- Disable when referee sent "stop"
	if World.RefereeState == "Stop" then
		return Base.State.Inactive
	end

	-- we somehow got the ball
	local goodSituation1 = (self._robot == Ball.friendlyBallOwner()) and not Ball.opponentBallOwner() 
	
	local firstRobot, timeAdvance = Ball.firstAtBall()
	-- noone else is there to get the ball and we have enough time to play safely
	local goodSituation2 = self._robot == firstRobot and (timeAdvance >= Settings.defenseRiskLevel)

	return (goodSituation1 or goodSituation2) and Base.State.Active or Base.State.Inactive
end

function HandleBall:_run()
	if false then -- FIXME, same as line 37 in agent/attacker/defaultshoot (commit 3aa317edc92f7b3aeb363c315238c0aad1de327e)
		self._task = DirectPass.create(self._robot)
	else -- under pressure
		self._task = ChipAway.create(self._robot)
	end
end

return HandleBall
