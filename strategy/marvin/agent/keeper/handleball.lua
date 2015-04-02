local Base = require "agent/base/behavior"
local HandleBall = Class("Agent.Keeper.HandleBall", Base)

local World = require "../base/world"
local Field = require "../base/field"
local Referee = require "../base/referee"
local CenterBack = require "task/centerback"
local AggressiveKeeper = require "task/aggressivekeeper"
local SaveBall = require "task/saveball"

function HandleBall:behindCenterbacks(object)
	local defenseDistance = 2*self._robot.radius + CenterBack.distanceToDefenseArea()
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
	for _,r in pairs(World.OpponentRobots) do
		if self:behindCenterbacks(r) then
			danger = true
		end
	end

	-- check if there is a danger of a own goal
	local ballDist = Field.distanceToFriendlyGoalLine(World.Ball.pos, 0)
	local robotDist = Field.distanceToFriendlyGoalLine(self._robot.pos, 0)
	local ballBehindKeeper = ballDist < robotDist

	-- decide whether to chip away or move aggressively to the ball
	if danger and not ballBehindKeeper then
		return AggressiveKeeper
	else
		return SaveBall
	end
end

return HandleBall
