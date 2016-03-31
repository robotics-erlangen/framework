local Base = require "agent/base/behavior"
local HandleBall = Class("Agent.Keeper.HandleBall", Base)

local debug = require "../base/debug"
local Field = require "../base/field"
local Referee = require "../base/referee"
local World = require "../base/world"

local Physics = require "observer/physics"
local AggressiveKeeper = require "task/aggressivekeeper"
local Keeper = require "task/keeper"
local KeeperChipAway = require "task/keeperchipaway"


local SLOW_BALL = 0.5

function HandleBall:behindCenterbacks(object)
	local defenseDistance = self._robot.radius + self._robot.shootRadius
	return Field.distanceToFriendlyDefenseArea(object.pos, object.radius) < defenseDistance
end

function HandleBall:check()
	if Referee.isStopState() or Referee.isOpponentPenaltyState() or World.GameStage == "PenaltyShootout" then
		return false
	end
	-- if a slow ball enters the defense area
	local active = self:behindCenterbacks(World.Ball) and World.Ball.speed:length() <= SLOW_BALL
	if active then
		-- force being mainAttacker
		self:_applyForMainAttacker(nil, nil, 2)
		return true
	else
		return false
	end
end

function HandleBall:_updateTask()
	local endPos = Physics.ballAtTime(World.Ball, math.huge).pos
	local startInside = Field.isInFriendlyDefenseArea(World.Ball.pos, -World.Ball.radius-self._robot.radius)
	local endInside = Field.isInFriendlyDefenseArea(endPos, -World.Ball.radius-self._robot.radius)

	-- check if there is a danger of a own goal
	local ballDist = Field.distanceToFriendlyGoalLine(World.Ball.pos, 0)
	local robotDist = Field.distanceToFriendlyGoalLine(self._robot.pos, 0)
	local ballBehindKeeper = ballDist < robotDist

	if startInside and endPos.y < World.Geometry.FriendlyGoal.y + 0.01 then
		-- if ball is inside defense area and will enter the goal -> block the ball
		return Keeper
	elseif startInside and endInside and not ballBehindKeeper then
		-- if ball is inside defense area and will not leave it -> we have time to act
		return KeeperChipAway
	else
		-- if inside and ball will leave or outside -> get rid of the ball
		return AggressiveKeeper
	end
end

return HandleBall
