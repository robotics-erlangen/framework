local Base = require "agent/base/behavior"
local Stop = Class("Agent.Attacker.Stop", Base)
local Ball = require "observer/ball"
local Referee = require "../base/referee"

local StopAttack = require "task/stopattack"

function Stop:check()
	return Referee.isStopState() and self._inbox.mainAttacker().trainer == self._robot
end

function Stop:_updateTask()
	return StopAttack
end

return Stop
