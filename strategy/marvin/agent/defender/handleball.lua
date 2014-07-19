local Base = require "agent/base/behavior"
local HandleBall = (require "../base/class").new("Agent.Defender.HandleBall", Base)

local World = require "../base/world"
local Referee = require "../base/referee"
local debug = require "../base/debug"
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
		if timeAdvance > -0.5 then
			self:_applyForMainAttacker()
		end
	end

	self._forceKeepingInPool = self._interceptingPass
	if self._interceptingPass then
		self:_applyForMainAttacker()
	end
	debug.set("intercepting pass", self._interceptingPass)

	return self._inbox.mainAttacker().trainer == self._robot
end

function HandleBall:_updateTask()
	local changeDist = World.Geometry.FieldHeight / 4
	local defenseDist = Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius)
	local firstRobot, timeAdvance = Ball.firstAtBall()

	if self._robot:hasBall(World.Ball) or defenseDist > changeDist or
	firstRobot == self._robot and timeAdvance > 1 then
		self._send.attackerRequest("trainer")
		self._requestingPoolChange = true
	end

	if Ball.receivesPass(self._robot) then
		self._interceptingPass = (Ball.friendlyBallOwner() ~= self._robot)
		return InterceptPass
	else
		self._interceptingPass = false
		return SaveBall
	end
end

return HandleBall
