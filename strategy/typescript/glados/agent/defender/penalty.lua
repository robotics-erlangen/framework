local Base = require "agent/base/behavior"
local Penalty = Class("Agent.Defender.Penalty", Base)

local World = require "../base/world"
local DefendPenalty = require "task/defender/defendpenalty"


function Penalty:check()
	return World.RefereeState == "PenaltyDefensivePrepare" or World.RefereeState == "PenaltyDefensive"
end

function Penalty:_updateTask()
	return DefendPenalty
end

return Penalty
