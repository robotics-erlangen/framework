local Base = require "agent/base/behaviour"
local Stop = (require "../base/class").new("Agent.Attacker.Stop", Base)
local Ball = require "observer/ball"
local Referee = require "util/referee"

local StopAttack = require "task/stopattack"

function Stop:_check()
	return Referee.isStopState() and Base.State.Active or Base.State.Inactive
end

function Stop:_run()
	if not self._task then
		self._task = StopAttack.create(self._robot)
	end
end

return Stop
