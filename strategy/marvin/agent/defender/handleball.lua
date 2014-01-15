local Base = require "agent/base/behavior"
local HandleBall = (require "../base/class").new("Agent.Defender.HandleBall", Base)

local World = require "../base/world"
local Referee = require "../base/referee"
local Ball = require "observer/ball"
local Shoot = require "observer/shoot"

local ChipAway = require "task/chipaway"
local DirectPass = require "task/directpass"

function HandleBall:check()
	if not (Referee.isFriendlyFreeKickState() or Referee.isStopState() or Referee.isKickoffState()) then
		self:_applyForMainAttacker()
	end
	if self._inbox.centerBack().trainer == self._robot then
		self:_applyForCenterBack()
	end
	return self._inbox.mainAttacker().trainer == self._robot
end

function HandleBall:_updateTask()
	local bestAssi = Shoot.bestFreeAssistant(self._robot, self._inbox.assistantRating("ignorePriority"))
	local _, timeAdvance = Ball.firstAtBall()
	if bestAssi and timeAdvance > Settings.defenseRiskLevel then
		return DirectPass, { bestAssi, true }
	else -- under pressure
		return ChipAway
	end
end

return HandleBall
