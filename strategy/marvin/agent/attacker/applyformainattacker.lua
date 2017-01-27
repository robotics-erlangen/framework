local Base = require "agent/base/behavior"
local ApplyForMainattacker = Class("Agent.Attacker.ApplyForMainattacker", Base)

local Referee = require "../base/referee"
local Robot = require "observer/robot"
local Attack = require "util/attack"


function ApplyForMainattacker:_init()
end

function ApplyForMainattacker:_stop()
end

function ApplyForMainattacker:check()
	if Referee.isOpponentPenaltyState() then
		return false
	end

	-- prevent double touches after a failed freekick by preventing the freekicking robot as mainattacker
	if not Referee.isFriendlyFreeKickState() and Robot.ownStandardShooter() == self._robot then
		return false
	end

	if Attack.currentPlannedMainAttacker(self._inbox.passInfo(),
			self._inbox.shootDestination()) == self._robot then
		self:_applyForMainAttacker(nil, nil, 2)
		self._agent.beOffensive = true
	else
		self:_applyForMainAttacker()
		self._agent.beOffensive = false
	end

	return false
end

function ApplyForMainattacker:_updateTask()
	error("This behavior is not supposed to run")
end

return ApplyForMainattacker
