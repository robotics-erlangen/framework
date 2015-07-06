local Base = require "agent/base/behavior"
local FreeKick = Class("Agent.Attacker.FreeKick", Base)

local World = require "../base/world"
local Referee = require "../base/referee"
local Robot = require "observer/robot"
local Shoot = require "observer/shoot"
local Ball = require "observer/ball"
local Physics = require "observer/physics"
local Field = require "../base/field"
local Pass = require "task/pass"
local ShootGoal = require "task/shootgoal"
local MoveToStaticBall = require "task/movetostaticball"
local GoalKick = require "task/goalkick"
local debug = require "../base/debug"

local POSITION_PADDING = 0.02 -- safety distance

function FreeKick:_stop()
	self._startTime = 0
	self._decision = nil
	self._pass = nil
	self._bestRating = -math.huge
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

	local switchDist = nearBallDist + self._robot.radius + World.Ball.radius + POSITION_PADDING
	local atBall =  self._robot.pos:distanceTo(World.Ball.pos) < switchDist

	-- if we are not near the ball yet, don't decide what to do
	if World.Time - self._startTime < hurryUp and not atBall then
		local viewDir = math.pi / 2
		-- don't require moving around the ball when shooting a corner kick
		return MoveToStaticBall, { viewDir, nearBallDist }
	end


	if not self._decision then
		--[[if goalKickFlag then
			return GoalKick
		end]]
		local shootGoalTmp = ShootGoal(self._agent)
		local sg_target, sg_mae, sg_clean = shootGoalTmp:getDecisionMakingBasis()

		-- search for the best pass suggestion
		local bestPassRating = 0
		local bestPass
		for robot, sugg in pairs(self._inbox.passSuggestion()) do
			local pass = {}
			pass.rating = sugg.rating
			pass.target = robot
			pass.pos = sugg.pos
			pass.receiveTime = sugg.time
			
			if self._pass and self._pass.target == robot then
				self._pass = pass
			end
			if sugg.rating > bestPassRating then
				bestPassRating = sugg.rating
				bestPass = pass
			end
		end

		-- if the robot is waiting and a better suggestion is available
		local bestPassRatingHysteresis = 3 / 180 * math.pi
		if bestPassRating > self._bestRating + bestPassRatingHysteresis then
			self._bestRating = bestPassRating
			self._pass = bestPass
		end
		if self._pass then
			debug.set("pass target", self._pass.target)
		end

		-- wait if necessary
		local delayPass = false
		if self._pass and self._pass.pos and self._pass.time then
			local shootTime = self._pass.receiveTime - Shoot.ballPassTime(World.Ball,
					self._pass.pos, self._pass.target)
			if World.Time < shootTime then
				delayPass = true
			end
		end

		local time = World.Time - self._startTime
		local min_mae = math.max((3 - time)/3 * 3, 0.7) / 180 * math.pi
		local min_pr = math.max((4 - time)/4 * 0.3, 0.005)
		local must_be_clean = time < 3

		if World.Ball.pos.y > 0 and World.RefereeState == "DirectOffensive"
				and (sg_clean or not must_be_clean) and sg_mae and sg_mae > min_mae then
			self._decision = "shootgoal"
		elseif self._pass and bestPassRating > min_pr and not delayPass then
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
		return MoveToStaticBall
	end
end

return FreeKick
