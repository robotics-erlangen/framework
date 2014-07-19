local Base = require "agent/base/behavior"
local HandleBall = (require "../base/class").new("Agent.Defender.HandleBall", Base)

local World = require "../base/world"
local Referee = require "../base/referee"
local Ball = require "observer/ball"
local Field = require "util/field"
local SaveBall = require "task/saveball"
local InterceptPass = require "task/interceptpass"

function HandleBall:check()
	if not Referee.isFriendlyFreeKickState()
		and not Referee.isStopState()
		and not Referee.isKickoffState()
	then
		local _, timeAdvance = Ball.firstAtBall()
		if timeAdvance > -Settings.defenseRiskLevel then
			self:_applyForMainAttacker()
		end
	end
	return self._inbox.mainAttacker().trainer == self._robot
end

function HandleBall:_updateTask()
	local changeDist = World.Geometry.FieldHeight / 4
	local defenseDist = Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius)
	local firstRobot, timeAdvance = Ball.firstAtBall()

	if firstRobot == self._robot and timeAdvance > 0.5 or defenseDist > changeDist then
		self._send.attackerRequest("trainer")
		self._requestingPoolChange = true
	end

	if Ball.receivesPass(self._robot) then
		return InterceptPass
	else
		return SaveBall
	end
end

return HandleBall
