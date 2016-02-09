local Base = require "agent/base/behavior"
local Stop = Class("Agent.Attacker.Stop", Base)

local World = require "../base/world"
local Referee = require "../base/referee"
local Ball = require "observer/ball"
local StopAttack = require "task/stopattack"
local PlaceBall = require "task/placeball"


function Stop:check()
	return Referee.isStopState() and self._inbox.mainAttacker().trainer == self._robot
end

function Stop:_updateTask()
	if World.RefereeState == "BallPlacementOffensive" and -- ball not in position yet
			(World.Ball.pos:distanceTo(World.BallPlacementPos) > 0.1 or
		 	World.Ball.speed:length() > 0.1)
	then
		return PlaceBall
	else
		return StopAttack
	end
end

return Stop
