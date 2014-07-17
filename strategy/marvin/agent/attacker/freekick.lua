local Base = require "agent/base/behavior"
local FreeKick = (require "../base/class").new("Agent.Attacker.FreeKick", Base)

local World = require "../base/world"
local Robot = require "observer/robot"
local Shoot = require "observer/shoot"
local Ball = require "observer/ball"
local Class = require "../base/class"

local Pass = require "task/pass"
local ShootGoal = require "task/shootgoal"
local MoveToStaticBall = require "task/movetostaticball"

function FreeKick:_stop()
	self._startTime = 0
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

local nearBallDist = 0.15
local hurryUp = 5
function FreeKick:_updateTask()
	local switchDist = nearBallDist + self._robot.radius + World.Ball.radius + Settings.positionPadding
	local atBall =  self._robot.pos:distanceTo(World.Ball.pos) < switchDist

	-- if we are not near the ball yet, don't decide what to do
	if World.Time - self._startTime < hurryUp and not atBall then
		return MoveToStaticBall, { math.pi/2, nearBallDist }
	end

	-- shootgoal
	local shootGoalTmp = ShootGoal.create(self._agent)
	local sg_target, sg_mae, sg_clean = shootGoalTmp:getDecisionMakingBasis()
	local shouldShoot = sg_mae and sg_mae > Settings.minAnglePrecision

	-- pass
	local pass
	local bestPassRating = 0
	for robot, sugg in pairs(self._inbox.passSuggestion()) do
		if sugg.rating > bestPassRating then
			pass = sugg
			pass.target = robot
			bestPassRating = sugg.rating
		end
	end

	if not (shouldShoot and World.RefereeState == "DirectOffensive") and pass then
		return Pass, { pass.target, pass.pos }
	else -- fallback: shootgoal, hope for ricochets etc when indirect
		return ShootGoal
	end
end

return FreeKick
