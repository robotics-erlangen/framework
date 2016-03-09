local Defense = {}

local Cache = require "../base/cache"
local Constants = require "../base/constants"
local Field = require "../base/field"
local Referee = require "../base/referee"
local World = require "../base/world"
local Physics = require "observer/physics"
local CenterBack = require "task/centerback"


Defense.POSITION_PADDING = 0.02 -- safety distance
Defense.PENALTY_LINE_DISTANCE = 0.35 -- prevent robots from crossing the penalty line

Defense.MARKING_DISTANCE = 0.5

local function manMarkPos(opponent)
	local dist = opponent.radius + Constants.maxRobotRadius + Defense.MARKING_DISTANCE
	local targetPos = opponent.pos + (World.Geometry.FriendlyGoal - opponent.pos):setLength(dist)

	-- extend position with speed of opponent, parameters can be improved
	local maxPosExtension = Constants.maxRobotRadius
	local extensionTime = 0.2
	local posExtension = math.min(maxPosExtension, opponent.speed:length()*extensionTime)
	targetPos = targetPos + opponent.speed:copy():setLength(posExtension)

	targetPos = Field.limitToAllowedField(targetPos, Constants.maxRobotRadius)
	if Referee.isStopState() then
		local minDist = World.Ball.radius + Constants.maxRobotRadius +
				Constants.stopBallDistance + Defense.POSITION_PADDING
		if targetPos:distanceTo(World.Ball.pos) < minDist then
			targetPos = World.Ball.pos + (targetPos - World.Ball.pos):setLength(minDist)
		end
	end
	if World.RefereeState == "PenaltyOffensivePrepare" or World.RefereeState == "PenaltyOffensive" then
		targetPos.y = math.min(targetPos.y, World.Geometry.PenaltyLine - Defense.PENALTY_LINE_DISTANCE)
	end
	return targetPos
end
Defense.manMarkPos = Cache.forFrame(manMarkPos)

local function centerBackPos(targetPos)
	local dist = CenterBack.distanceToDefenseArea() + Constants.maxRobotRadius
	local dir = World.Geometry.FriendlyGoal - targetPos
	return Field.intersectRayDefenseArea(targetPos, dir, dist) or CenterBack.defaultPos
end
Defense.centerBackPos = Cache.forFrame(centerBackPos)

-- if the ball will reach our defense area with at least that speed, stay defender
local DANGEROUS_BALL_SPEED = 1.0
function Defense.dangerousBallTowardsDefense()
	-- if the ball rolls towards our defense area with high speed, stay defender
	local defenseLineIntersection = Field.intersectRayDefenseArea(World.Ball.pos, World.Ball.speed)
	if defenseLineIntersection then
		local timeToDefenseLine = Physics.ballRollTime(World.Ball,
			World.Ball.pos:distanceTo(defenseLineIntersection))
		local speedAtDefenseLine = Physics.ballAtTime(World.Ball, timeToDefenseLine).speed:length()
		if speedAtDefenseLine > DANGEROUS_BALL_SPEED then
			return true
		end
	end
	return false
end

return Defense
