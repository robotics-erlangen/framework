local World = require "../base/world"
local Constants = require "../base/constants"
local Field = require "../base/field"
local Referee = require "../base/referee"
local Cache = require "../base/cache"

local POSITION_PADDING = 0.02 -- safety distance
local PENALTY_LINE_DISTANCE = 0.35 -- prevent robots from crossing the penalty line
local MARKING_DISTANCE = 0.05 -- close enough

local Defense = {}

local markingOrientations = {} -- for hysteresis
local function manMarkPos(opponent)
	local orientation = opponent and markingOrientations[opponent] or World.Ball
	if World.Ball.pos.y < -World.Geometry.FieldHeight / 6 then
		orientation = World.Geometry.FriendlyGoal
	end
	if World.Ball.pos.y > 0 then
		orientation = World.Ball
	end
	if opponent ~= nil then
		markingOrientations[opponent] = orientation
	end
	local orientationPos = (orientation == World.Ball) and orientation.pos or orientation

	local dist = opponent.radius + Constants.maxRobotRadius + MARKING_DISTANCE
	local targetPos = opponent.pos + (orientationPos - opponent.pos):setLength(dist)

	-- extend position with speed of opponent, parameters can be improved
	local maxPosExtension = Constants.maxRobotRadius
	local extensionTime = 0.1
	local posExtension = math.min(maxPosExtension, opponent.speed:length()*extensionTime)
	targetPos = targetPos + opponent.speed:copy():setLength(posExtension)

	targetPos = Field.limitToAllowedField(targetPos, Constants.maxRobotRadius, true)
	if Referee.isStopState() then
		local minDist = World.Ball.radius + Constants.maxRobotRadius + Constants.stopBallDistance + POSITION_PADDING
		if targetPos:distanceTo(World.Ball.pos) < minDist then
			targetPos = World.Ball.pos + (targetPos - World.Ball.pos):setLength(minDist)
		end
	end
	if World.RefereeState == "PenaltyOffensivePrepare" or World.RefereeState == "PenaltyOffensive" then
		targetPos.y = math.min(targetPos.y, World.Geometry.PenaltyLine - PENALTY_LINE_DISTANCE)
	end
	return targetPos
end
Defense.manMarkPos = Cache.forFrame(manMarkPos)


return Defense
