local Base = require "agent/base/behavior"
local HandleBall = (require "../base/class").new("Agent.Defender.HandleBall", Base)

local World = require "../base/world"
local Referee = require "../base/referee"
local Ball = require "observer/ball"
local Shoot = require "observer/shoot"

local ChipAway = require "task/chipaway"
local DirectPass = require "task/directpass"

function HandleBall:check()
	if World.Ball.pos.y < 0
		and not Referee.isFriendlyFreeKickState()
		and not Referee.isStopState()
		and not Referee.isKickoffState()
	then
		_, timeAdvance = Ball.firstAtBall()
		if timeAdvance > -Settings.defenseRiskLevel then
			self:_applyForMainAttacker()
		end
	end
	if self._inbox.centerBack().trainer == self._robot then
		self:_applyForCenterBack()
	end
	return self._inbox.mainAttacker().trainer == self._robot
end

function HandleBall:_updateTask()
	local bestAssi = Shoot.bestFreeAssistant(self._robot, self._inbox.attackerFlag("ignorePriority"))
	--local _, timeAdvance = Ball.firstAtBall()
	if bestAssi then --and timeAdvance > Settings.defenseRiskLevel then
		return DirectPass, { bestAssi, true }
	else -- under pressure
		return ChipAway
	end
end

return HandleBall
