local Base = require "agent/base/behavior"
local HandleBall = (require "../base/class").new("Agent.Defender.HandleBall", Base)

local World = require "../base/world"
local geom = require "../base/geom"
local Referee = require "../base/referee"
local debug = require "../base/debug"
local Ball = require "observer/ball"
local Field = require "util/field"
local CenterBack = require "task/centerback"
local SaveBall = require "task/saveball"
local InterceptPass = require "task/interceptpass"


function HandleBall:check()
	if Referee.isFriendlyFreeKickState() or Referee.isStopState() or Referee.isKickoffState() then
		return false
	end

	if World.Ball.speed.y < 0 and World.Ball.speed:length() > 3 then
		if Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius) <
				self._robot.radius + CenterBack.distanceToDefenseArea() then
			local _, lambda = geom.intersectLineLine(World.Geometry.FriendlyGoal, Vector.create(1, 0),
					World.Ball.pos, World.Ball.speed)
			if math.abs(lambda) < World.Geometry.DefenseRadius + World.Geometry.DefenseStretch/2 then
				return false
			end
		end
	end

	local _, timeAdvance = Ball.firstAtBall()
	if timeAdvance > -0.5 then
		self:_applyForMainAttacker()
	end

	self._forceKeepingInPool = self._interceptingPass
	if self._interceptingPass then
		self:_applyForMainAttacker()
	end
	debug.set("intercepting pass", self._interceptingPass)

	return self._inbox.mainAttacker().trainer == self._robot
end

local doubleSizedField = World.Geometry.FieldHeight > 7
function HandleBall:_updateTask()
	local changeDist = World.Geometry.FieldHeight / 4
	local defenseDist = Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius)
	local firstRobot, timeAdvance = Ball.firstAtBall()

	local minAttackDist = doubleSizedField and 1.7 or 1.2
	if self._robot:hasBall(World.Ball) or defenseDist > changeDist or
			firstRobot == self._robot and timeAdvance > 1 and
			Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius) > minAttackDist
	then
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
