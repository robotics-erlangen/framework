local Class = require "../base/class"
local Base = require "agent/base/behavior"
local FreeKick = Class.new("Agent.Attacker.FreeKick", Base)

local World = require "../base/world"
local Robot = require "observer/robot"
local Shoot = require "observer/shoot"
local Ball = require "observer/ball"
local Field = require "util/field"

local Pass = require "task/pass"
local ShootGoal = require "task/shootgoal"
local MoveToStaticBall = require "task/movetostaticball"
local GoalKick = require "task/goalkick"

function FreeKick:_stop()
	self._startTime = 0
	self._decision = nil
	self._pass = nil
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
local hurryUp = 6
function FreeKick:_updateTask()
	local goalKickFlag = Field.isInOwnCorner(World.Ball.pos, false)
	
	local switchDist = nearBallDist + self._robot.radius + World.Ball.radius + Settings.positionPadding
	local atBall =  self._robot.pos:distanceTo(World.Ball.pos) < switchDist

	-- if we are not near the ball yet, don't decide what to do
	if World.Time - self._startTime < hurryUp and not atBall then
		local goalKickViewDir = World.Ball.pos.x > 0 and 0 or math.pi
		local viewDir = goalKickFlag and goalKickViewDir or math.pi/2
		return MoveToStaticBall, { viewDir, nearBallDist }
	end


	if not self._decision then
		if goalKickFlag then
			return GoalKick
		end
		local shootGoalTmp = ShootGoal.create(self._agent)
		local sg_target, sg_mae, sg_clean = shootGoalTmp:getDecisionMakingBasis()
		
		local bestPassRating = 0
		local pass
		for robot, sugg in pairs(self._inbox.passSuggestion()) do
			if sugg.rating > bestPassRating then
				pass = sugg
				pass.target = robot
				bestPassRating = sugg.rating
			end
		end
		self._pass = pass

		local time = World.Time - self._startTime
		local min_mae = math.max((3 - time)/3 * 3, 0.7) / 180 * math.pi
		local min_pr = math.max((4 - time)/4 * 0.3, 0.005)
		local must_be_clean = time < 3

		if World.Ball.pos.y > 0 and World.RefereeState == "DirectOffensive"
				and (sg_clean or not must_be_clean) and sg_mae and sg_mae > min_mae then
			self._decision = "shootgoal"
		elseif pass and bestPassRating > min_pr then
			self._decision = "pass"
		end

		-- timeout
		if time > 8 then
			self._decision = "shootgoal"
		end
	end


	if self._decision == "shootgoal" then
		return ShootGoal
	elseif self._decision == "pass" then
		return Pass, {self._pass.target, self._pass.pos}
	else
		return MoveToStaticBall, { math.pi/2, nearBallDist }
	end
end

return FreeKick
