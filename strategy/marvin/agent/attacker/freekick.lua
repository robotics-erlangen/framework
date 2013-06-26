local Base = require "agent/base/behaviour"
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
 
function FreeKick:_check()
	if self._state ~= Base.State.Active then
		self.startTime = World.Time
	end
	-- mostly copied from shoot behaviour commit 8a6b0bd364abfb27
	if self._state == Base.State.Active and Ball.isShot() then -- I've shot the ball
		self._shootTime = World.Time
		return Base.State.CoolDown
	elseif self._state == Base.State.CoolDown then
		local friend = Ball.friendlyBallOwner()
		if Ball.opponentBallOwner() or (friend ~= nil and friend ~= self._robot) then
			return Base.State.Inactive
		end
		-- shootgoal has a timeout of 0.5 seconds, 1.0 seconds for passing
		local timeout = self._pass and 1 or 0.5
		if self._shootTime + timeout < World.Time then
			return Base.State.Inactive
		end
		return Base.State.CoolDown
	elseif World.RefereeState == "DirectOffensive" or World.RefereeState == "IndirectOffensive" then
		return Base.State.Active
	end
	return Base.State.Inactive
end

function FreeKick:_run()
	-- if there's still time and we don't have the ball
	if (World.Time - self.startTime < 5 and not self._robot:hasBall(World.Ball)) or not self._robot:isCharged() then
		if not self._task or not Class.instanceOf(self._task, MoveToStaticBall) then
			self._task = MoveToStaticBall.create(self._robot, World.Geometry.OpponentGoal)
		end
	-- otherwise, we can do the freekick
	elseif not self._task or Class.instanceOf(self._task, MoveToStaticBall) then
		if World.RefereeState == "IndirectOffensive" or Settings.partnerRobots then
			self:passOrChipTask()
		elseif World.RefereeState == "DirectOffensive" then
			local shootGoal = ShootGoal.create(self._robot, true)
			if shootGoal:canShoot() then
				self._task = shootGoal
			else 
				self._pass = true
				self:passOrChipTask()
			end
		end
	end
end

function FreeKick:passOrChipTask()
	local bestRobot = Shoot.bestFreeAssistant(self._robot, self._messages)
	if bestRobot then
		self._task = DirectPass.create(self._robot, bestRobot, true)
	else
		self._task = ChipAway.create(self._robot)
	end
end

function FreeKick:_stop()
	self._pass = false
	self._shootTime = 0
end

return FreeKick
