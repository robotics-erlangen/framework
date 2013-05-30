local Base = require "agent/base/behaviour"
local DefaultStop = (require "../base/class").new("Agent.Attacker.DefaultStop", Base)
local Ball = require "observer/ball"
local Referee = require "util/referee"

local StopAttack = require "task/stopattack"

function DefaultStop:_check()
	return Referee.isStopState() and Base.State.Active or Base.State.Inactive
end

function DefaultStop:_run()
	if not self._task then
		self._task = StopAttack.create(self._robot)
	end
end

return DefaultStop
