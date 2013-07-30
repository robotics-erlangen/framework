local Base = require "agent/base/behavior"
local Penalty = (require "../base/class").new("Agent.Defender.Penalty", Base)

local World = require "../base/world"

local DefendPenalty = require "task/defendpenalty"

function Penalty:check()
	return World.RefereeState == "PenaltyDefensivePrepare" or World.RefereeState == "PenaltyDefensive"
end

function Penalty:updateTask()
	return DefendPenalty
end

return Penalty
