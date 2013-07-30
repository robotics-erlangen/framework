local Base = require "agent/base/behavior"
local Stop = (require "../base/class").new("Agent.Attacker.Stop", Base)
local Ball = require "observer/ball"
local Referee = require "util/referee"

local StopAttack = require "task/stopattack"

function Stop:check()
	return Referee.isStopState() and self.inbox.specialRole().trainer == "mainAttacker"
end

function Stop:updateTask()
	return StopAttack
end

return Stop
