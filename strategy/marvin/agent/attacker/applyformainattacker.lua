local Base = require "agent/base/behavior"
local ApplyForMainattacker = (require "../base/class").new("Agent.Attacker.ApplyForMainattacker", Base)
local Referee = require "util/referee"

function ApplyForMainattacker:check()
	if not Referee.isOpponentPenaltyState() then
		self:_applyForMainAttacker()
	end
	return false
end

function ApplyForMainattacker:_updateTask()
	error("This behavior is not supposed to run")
end

return ApplyForMainattacker
