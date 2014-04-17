local Base = require "agent/base/behavior"
local ApplyForCenterback = (require "../base/class").new("Agent.Defender.ApplyForCenterback", Base)
local Referee = require "../base/referee"

function ApplyForCenterback:check()
	if not Referee.isOpponentPenaltyState() then
		self:_applyForCenterBack()
	end
	return false
end

function ApplyForCenterback:_updateTask()
	error("This behavior is not supposed to run")
end

return ApplyForCenterback