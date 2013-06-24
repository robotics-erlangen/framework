local Base = require "agent/base/behaviour"
local FreeKick = (require "../base/class").new("Agent.Attacker.FreeKick", Base)

local World = require "../base/world"
local Robot = require "observer/robot"
local Shoot = require "observer/shoot"
local Class = require "../base/class"

local ChipAway = require "task/chipaway"
local DirectPass = require "task/directpass"
local ShootGoal = require "task/shootgoal"
local MoveToStaticBall = require "task/movetostaticball"
 
function FreeKick:_check()
	local isFreeKick = World.RefereeState == "DirectOffensive" or World.RefereeState == "IndirectOffensive"
	if self._state ~= Base.State.Active then
		self.startTime = World.Time
	end
	return isFreeKick and Base.State.Active or Base.State.Inactive
end

function FreeKick:_run()
	-- if there's still time and we don't have the ball
	if (World.Time - self.startTime < 5 and not self._robot:hasBall(World.Ball)) or not self._robot:isCharged() then
		if not self._task or not Class.instanceOf(self._task, MoveToStaticBall) then
			self._task = MoveToStaticBall.create(self._robot, World.Geometry.OpponentGoal)
		end
	-- otherwise, we can do the freekick
	elseif not self._task or Class.instanceOf(self._task, MoveToStaticBall) then
		if World.RefereeState == "IndirectOffensive" then
			self:passOrChipTask()
		elseif World.RefereeState == "DirectOffensive" then
			local shootGoal = ShootGoal.create(self._robot, true)
			if shootGoal:canShoot() then
				self._task = shootGoal
			else 
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

return FreeKick
