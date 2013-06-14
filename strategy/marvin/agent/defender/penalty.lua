local Base = require "agent/base/behaviour"
local Penalty = (require "../base/class").new("Agent.Defender.Penalty", Base)

local World = require "../base/world"

local Halt = require "task/halt"
local DefendPenalty = require "task/defendpenalty"

function Penalty:_check()
	local isPenalty = World.RefereeState == "PenaltyDefensivePrepare" or World.RefereeState == "PenaltyDefensive"
	return isPenalty and Base.State.Active or Base.State.Inactive
end

function Penalty:_run()
	if not self._task then
		self._task = DefendPenalty.create(self._robot)	
	end
end

return Penalty
