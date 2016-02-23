local Base = require "agent/base/behavior"
local HandleBall = Class("Agent.Defender.HandleBall", Base)

local World = require "../base/world"
local Robot = require "observer/robot"
local Duel = require "task/duel"
local InterceptPass = require "task/interceptpass"


function HandleBall:_stop()
	self._timeAdvance = -math.huge
	self._isMainAttacker = false
end

function HandleBall:check()
	local selfTime = Robot.minTimeToBall(self._robot)
	local _, opponentTime = Robot.fastestOpponentAtBall()
	self._timeAdvance = opponentTime - selfTime

	self._isMainAttacker = self._inbox.mainAttacker().trainer == self._robot
	if self._isMainAttacker or self._timeAdvance > 0 then
		self:_applyForMainAttacker()
	end

	return self._isMainAttacker
end

function HandleBall:_updateTask()
	if self._timeAdvance > 0.5 then
		self._send.attackerRequest("trainer")
		self._requestingPoolChange = true
		self._forceKeepingInPool = false
	end

	if self._timeAdvance > 0 and World.Ball.speed:length() > 1.5 then
		return InterceptPass
	else
		return Duel
	end
end

return HandleBall
