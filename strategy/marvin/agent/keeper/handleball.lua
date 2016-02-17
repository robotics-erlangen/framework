local Base = require "agent/base/behavior"
local HandleBall = Class("Agent.Keeper.HandleBall", Base)

local debug = require "../base/debug"
local Field = require "../base/field"
local Referee = require "../base/referee"
local World = require "../base/world"

local AggressiveKeeper = require "task/aggressivekeeper"
local SaveBall = require "task/saveball"
local ShootGoal = require "task/shootgoal"
local MoveToStaticBall = require "task/movetostaticball"


function HandleBall:behindCenterbacks(object)
	local defenseDistance = self._robot.radius + self._robot.shootRadius
	return Field.distanceToFriendlyDefenseArea(object.pos, object.radius) < defenseDistance
end

local SLOW_BALL = 0.5
function HandleBall:check()
	if Referee.isStopState() or World.RefereeState == "PenaltyDefensive" or
			World.RefereeState == "PenaltyDefensivePrepare" or World.GameStage == "PenaltyShootout" then
		return false
	end
	-- if a slow ball enters the defense area
	local active = self:behindCenterbacks(World.Ball)
			and World.Ball.speed:length() <= SLOW_BALL
	if active then
		-- force being mainAttacker
		self._send.exclusiveRole("trainer", {mainAttacker = 2})
		return true
	else
		return false
	end
end

function HandleBall:_updateTask()
	-- track opponent robots in defense area
	local danger = false
	for _,r in ipairs(World.OpponentRobots) do
		if self:behindCenterbacks(r) then
			danger = true
		end
	end

	-- check if there is a danger of a own goal
	local ballDist = Field.distanceToFriendlyGoalLine(World.Ball.pos, 0)
	local robotDist = Field.distanceToFriendlyGoalLine(self._robot.pos, 0)
	local ballBehindKeeper = ballDist < robotDist

	debug.set("Ball Speed", World.Ball.speed:length())
	debug.set("Ball safe in defense area", Field.isInFriendlyDefenseArea(World.Ball.pos, World.Ball.radius-2*self._robot.radius))

	local ballInDefenseAreaWithTwoRobotsDistance = Field.isInFriendlyDefenseArea(World.Ball.pos, World.Ball.radius-4*self._robot.radius)
	local ballInDefenseAreaWithOneRobotDistance = Field.isInFriendlyDefenseArea(World.Ball.pos, World.Ball.radius-2*self._robot.radius)

	--if the ball is rolling slowly through the defence area stop it
	if ballInDefenseAreaWithTwoRobotsDistance and World.Ball.speed:length() > 0.1 and not ballBehindKeeper then
		local rotation = (-World.Ball.speed):angle()
		--don't align goal-ball-keeper
		if rotation < 0 then
			rotation = math.pi/2
		end
		return MoveToStaticBall, {rotation, 0.03}
	end

	-- if the ball is lying in our defense area we can shoot in the direction of the opponents goal and not just at the sides
	if ballInDefenseAreaWithOneRobotDistance and World.Ball.speed:length()<=0.1 and not ballBehindKeeper then
		return ShootGoal
	end
	
	-- decide whether to chip away or move aggressively to the ball
	if danger and not ballBehindKeeper then
		return AggressiveKeeper
	else
		return SaveBall
	end
end

return HandleBall
