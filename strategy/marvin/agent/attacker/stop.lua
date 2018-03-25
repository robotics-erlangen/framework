local Base = require "agent/base/behavior"
local Stop = Class("Agent.Attacker.Stop", Base)

local World = require "../base/world"
local Referee = require "../base/referee"
local StopAttack = require "task/attacker/stopattack"
local PlaceBall = require "task/attacker/placeball"


function Stop:check()
	return Referee.isStopState() and self._inbox.mainAttacker().trainer == self._robot
end

function Stop:_updateTask()
	if World.RefereeState == "BallPlacementOffensive" then
		return PlaceBall
	else
		return StopAttack
	end
end

return Stop
