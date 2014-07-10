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
	self._startTime = 0
	self._atBall = false
end

function FreeKick:check()
	-- we have to be main attacker
	if not (self._inbox.mainAttacker().trainer == self._robot) then
		return false
	end

	-- update timeout timer
	if not self._active then
		self._startTime = World.Time
	end

	if World.RefereeState == "DirectOffensive" or World.RefereeState == "IndirectOffensive" then
		return true
	end

	-- rely on applyformainattacker to cancel the freekick
	-- otherwise we get timing issues because freekick gets cancelled before the main attacker
	-- gets taken away from us and therefore some other behaviour takes the spot for a few frames
	if self._active then
		return true
	end

	return false
end

function FreeKick:_updateTask()
	local nearBallDist = 0.15
	local hurryUp = 5

	local switchDist = nearBallDist + self._robot.radius + World.Ball.radius + Settings.positionPadding
	if self._robot.pos:distanceTo(World.Ball.pos) < switchDist then
		self._atBall = true
	end

	-- if we are not near the ball yet, don't decide what to do
	if World.Time - self._startTime < hurryUp and not self._atBall then
		--return MoveToStaticBall, {math.pi/2, nearBallDist}
	end

	-- if we are forced to perform a pass
	if World.RefereeState == "IndirectOffensive" then
		return self:passOrChipTask()
	end

	-- TODO: fix that ancient crap
	local shootGoalTmp = ShootGoal.create(self._agent)
	local sg_target, sg_mae, sg_clean = shootGoalTmp:getDecisionMakingBasis()
	local canShootGoal = sg_mae and sg_mae > Settings.minAnglePrecision
	if canShootGoal then
		return ShootGoal
	else
		return self:passOrChipTask()
	end
end

function FreeKick:passOrChipTask()
	-- TODO: fix that ancient crap
	local bestRobot = Shoot.bestFreeAssistant(self._robot)
	if bestRobot then
		return DirectPass, {bestRobot, true}
	else
		return ChipAway
	end
end

return FreeKick
