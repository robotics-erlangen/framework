local Base = require "agent/base/behavior"
local FreeKick = (require "../base/class").new("Agent.Attacker.FreeKick", Base)

local World = require "../base/world"
local Robot = require "observer/robot"
local Shoot = require "observer/shoot"
local Ball = require "observer/ball"
local Class = require "../base/class"

local ChipAway = require "task/chipaway"
local DirectPass = require "task/directpass"
local ShootGoal = require "task/shootgoal"
local MoveToStaticBall = require "task/movetostaticball"

function FreeKick:_stop()
	self._pass = false
	self._shootTime = 0
	self._startTime = 0
	self._cooldown = false
	self._atBall = false
end
 
function FreeKick:check()
	if not (self._inbox.mainAttacker().trainer == self._robot) then
		return false
	end

	if not self._active then
		self._startTime = World.Time
	end

	if self._active and not self._cooldown and Ball.isShot() then -- I've shot the ball
		self._shootTime = World.Time
		self._cooldown = true
		return true
	elseif self._cooldown then
		local friend = Ball.friendlyBallOwner()
		if Ball.opponentBallOwner() or (friend ~= nil and friend ~= self._robot) then
			return false
		end
		-- shootgoal has a timeout of 0.5 seconds, 1.0 seconds for passing
		local timeout = self._pass and 1 or 0.5
		if self._shootTime + timeout < World.Time then
			return false
		end
		return true
	elseif World.RefereeState == "DirectOffensive" or World.RefereeState == "IndirectOffensive" then
		return true
	end
	return false
end

function FreeKick:_updateTask()
	local distanceToBall = 0.05

	-- if there's still time and we don't have the ball
	local notAtBall = self._robot.pos:distanceTo(World.Ball.pos) > 
			self._robot.radius + World.Ball.radius + distanceToBall + Settings.positionPadding
	if ((World.Time - self._startTime < 5 and notAtBall) or not self._robot:isCharged())
			and not self._atBall then
		return MoveToStaticBall, {math.pi/2, distanceToBall}
	else -- let's do this freekick
		self._atBall = true
		if World.RefereeState == "IndirectOffensive" then
			return self:passOrChipTask()
		else -- DirectOffensive
			local shootGoalTmp = ShootGoal.create(self._agent)
			if shootGoalTmp:canShoot() then
				return ShootGoal
			else 
				self._pass = true
				return self:passOrChipTask()
			end
		end
	end
end

function FreeKick:passOrChipTask()
	local bestRobot = Shoot.bestFreeAssistant(self._robot)
	if bestRobot then
		return DirectPass, {bestRobot, true}
	else
		return ChipAway
	end
end

return FreeKick
