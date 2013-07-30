local Base = require "agent/base/behavior"
local HandleBall = (require "../base/class").new("Agent.Defender.HandleBall", Base)

local World = require "../base/world"
local Ball = require "observer/ball"
local Shoot = require "observer/shoot"

local ChipAway = require "task/chipaway"
local DirectPass = require "task/directpass"

function HandleBall:check()
	return self.inbox.mainAttacker().trainer == self._robot
end

function HandleBall:updateTask()
	local bestAssi = Shoot.bestFreeAssistant(self._robot, self.inbox.assistantRating())
	local _, timeAdvance = Ball.firstAtBall()
	if bestAssi and timeAdvance > Settings.defenseRiskLevel then
		return DirectPass, { bestAssi, true }
	else -- under pressure
		return ChipAway
	end
end

return HandleBall
