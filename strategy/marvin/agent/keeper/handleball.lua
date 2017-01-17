local Base = require "agent/base/behavior"
local HandleBall = Class("Agent.Keeper.HandleBall", Base)

local Field = require "../base/field"
local Referee = require "../base/referee"
local World = require "../base/world"

local Physics = require "observer/physics"
local AggressiveKeeper = require "task/aggressivekeeper"
local Keeper = require "task/keeper"
local KeeperChipAway = require "task/chipaway"
local Pass = require "task/pass"


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
	end

	local mainAttackerFlag = self._inbox.mainAttacker().trainer == self._robot
	return mainAttackerFlag
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
	elseif startInside and endInside and not ballBehindKeeper and self._inbox.passSuggestion() then
		-- if ball is inside defense area and will not leave it -> we have time to act
		-- try to find a good pass
		local bestPass = {}
		
		for robot, sugg in pairs(self._inbox.passSuggestion()) do			
			local pass = {}
			pass.rating = sugg.rating
			pass.target = robot
			pass.pos = sugg.pos
			pass.receiveTime = sugg.time

			log(pass.rating)
			log(bestPass.rating)
			
			if not bestPass.rating then
				bestPass.rating = pass.rating
				bestPass.target = pass.target
				bestPass.pos = pass.pos
				bestPass.receiveTime = pass.receiveTime
				
			elseif pass.rating > bestPass.rating then
				bestPass.rating =pass.rating
				bestPass.target = pass.target
				bestPass.pos = pass.pos
				bestPass.receiveTime = pass.receiveTime
				
			end
		end
		if bestPass.target then --check if there is a good pass, else chip away
			return Pass, {bestPass.target}
		else
			return KeeperChipAway
		end
	
	else
		-- if inside and ball will leave or outside -> get rid of the ball
		return AggressiveKeeper
	end
end

return HandleBall
