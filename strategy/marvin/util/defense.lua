local Defense = {}

local Cache = require "../base/cache"
local Constants = require "../base/constants"
local debug = require "../base/debug"
local Field = require "../base/field"
local geom = require "../base/geom"
local Referee = require "../base/referee"
local World = require "../base/world"
local Goal = require "observer/goal"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local CenterBack = require "task/defender/centerback"
local Rating = require "util/rating"

local G = World.Geometry

Defense.POSITION_PADDING = 0.02 -- safety distance
Defense.PENALTY_LINE_DISTANCE = 0.35 -- prevent robots from crossing the penalty line

Defense.MARKING_DISTANCE = 0.6
Defense.OFFENSIVE_MARKING_DISTANCE = 0.3

local function manMarkPos(opponent)
	local targetPos
	if World.Ball.pos.y > World.Geometry.FieldHeightHalf * 0.7 and World.Ball.speed:length() < 0.5 and Referee.isStopState() then
		local dist = opponent.radius + Constants.maxRobotRadius + Defense.OFFENSIVE_MARKING_DISTANCE
		targetPos = opponent.pos + (World.Ball.pos - opponent.pos):setLength(dist)
	else
		local oppDistToGoal = opponent.pos:distanceTo(World.Geometry.FriendlyGoal)
		local markingDistance = Defense.MARKING_DISTANCE + math.max(0, (oppDistToGoal - World.Geometry.FieldHeightHalf * 0.8) * 0.5)
		if Referee.isFriendlyFreeKickState() then
			markingDistance = markingDistance + 0.4
		end
		local dist = opponent.radius + Constants.maxRobotRadius + markingDistance
		targetPos = opponent.pos + (World.Geometry.FriendlyGoal - opponent.pos):setLength(dist)
	end

	-- use the position at which the robot would brake if it started immediately
	targetPos = Physics.robotBrakePos({pos = targetPos, speed = opponent.speed, radius = opponent.radius})
	targetPos = Field.limitToAllowedField(targetPos, Constants.maxRobotRadius)

	local intersectionDefenseArea = Field.intersectRayDefenseArea(targetPos,
				World.Geometry.FriendlyGoal - targetPos,
				Constants.maxRobotRadius + 0.1, true)

	if intersectionDefenseArea and not Referee.isStopState() then
		targetPos = intersectionDefenseArea + (targetPos - intersectionDefenseArea) :scaleLength(0.3)
	end

	if Referee.isStopState() or intersectionDefenseArea 
				and intersectionDefenseArea:distanceToSq(targetPos) < 0.75*0.75 then
		targetPos = intersectionDefenseArea or targetPos
	end

	if World.RefereeState == "PenaltyOffensivePrepare" or World.RefereeState == "PenaltyOffensive" then
		targetPos.y = math.min(targetPos.y, World.Geometry.PenaltyLine - Defense.PENALTY_LINE_DISTANCE)
	end

	return targetPos
end
Defense.manMarkPos = Cache.forFrame(manMarkPos)

local function calculateBallPosition(distanceToDefenseArea, robot_radius)
	local targetPos, targetDir, isShot = Goal.predictShot()
	local targetWay = nil

	if isShot and targetDir.y < 0 then
		local goalLineIntersection = geom.intersectLineLine(targetPos,
			targetDir, World.Geometry.FriendlyGoal, Vector(1, 0))
		if goalLineIntersection and
				math.abs(goalLineIntersection.x) < World.Geometry.GoalWidth / 2 + 0.15 then
			-- FIXME: HACK FOR FLOATS
			targetPos, targetWay = Field.intersectRayDefenseArea(targetPos, targetDir, distanceToDefenseArea + robot_radius + 0.02 , true)
		end
	end
	if not targetPos then
		targetPos = World.Ball.pos
	end

	return targetPos, targetWay
end
Defense.calculateBallPosition = Cache.forFrame(calculateBallPosition)

local function centerBackPos(targetPos)
	local dist = CenterBack.distanceToDefenseArea() + Constants.maxRobotRadius
	local dir = World.Geometry.FriendlyGoal - targetPos
	return Field.intersectRayDefenseArea(targetPos, dir, dist, true) or CenterBack.defaultPos
end
Defense.centerBackPos = Cache.forFrame(centerBackPos)

-- if the ball will reach our defense area with at least that speed, stay defender
local DANGEROUS_BALL_SPEED = 3.0
function Defense.dangerousBallTowardsDefense(opp)
	-- if the ball rolls towards our defense area with high speed, stay defender
	local defenseLineIntersection = Field.intersectRayDefenseArea(World.Ball.pos, World.Ball.speed, 0, not opp)
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

function Defense.getClosestRobot(robotlist, pos)
	local minDist = math.huge
	local minRobot = nil
	for _, r in ipairs(robotlist) do
		local dist = r.pos:distanceTo(pos)
		if dist < minDist then
			minDist = dist
			minRobot = r
		end
	end
	return minRobot, minDist
end

local function ratePassThreats()
	local dangerousness = {}
	local futureBallPos = Goal.predictShot()
	for _,opp in ipairs(World.OpponentRobots) do
		-- TODO comment
		local angleBallOppGoal = (futureBallPos - opp.pos):absoluteAngleDiff(
			World.Geometry.FriendlyGoal - opp.pos)
		local angleOppGoalY = (opp.pos - World.Geometry.FriendlyGoal):absoluteAngleDiff(Vector(0, 1))
		local distOppGoal = opp.pos:distanceTo(World.Geometry.FriendlyGoal)

		local ratingAngleBallOppGoal = Rating.valueToRating(angleBallOppGoal, 120 * math.pi/180, 80 * math.pi/180)
		local ratingAngleOppGoalY = Rating.valueToRating(angleOppGoalY, 85 * math.pi/180, 70 * math.pi/180)
		local ratingDistOppGoal = Rating.valueToRating(distOppGoal,
			World.Geometry.FieldHeight * 0.85, World.Geometry.FieldHeight * 0.4)

		local rating = ratingAngleBallOppGoal * ratingAngleOppGoalY * ratingDistOppGoal
		dangerousness[opp] = rating
	end
	return dangerousness
end
Defense.ratePassThreats = Cache.forFrame(ratePassThreats)

local function rateVolleyGoalShotThreats()
	local dangerousness = {}
	if World.Ball.speed:length() > 1.5 then
		for _,opp in ipairs(World.OpponentRobots) do
			local rating = 1
			if not Robot.hadBall(opp, 0.2) then
				local angleBallOppGoal = (World.Ball.pos - opp.pos):absoluteAngleDiff(
						World.Geometry.FriendlyGoal - opp.pos)
				local angleBallSpeedOpp = World.Ball.speed:absoluteAngleDiff(opp.pos - World.Ball.pos)
				local ratingAngleBallOppGoal = Rating.valueToRating(angleBallOppGoal, 85 * math.pi/180, 65 * math.pi/180)
				local ratingAngleBallSpeedOpp = Rating.valueToRating(angleBallSpeedOpp, 45 * math.pi/180, 30 * math.pi/180)
				rating = ratingAngleBallOppGoal * ratingAngleBallSpeedOpp
			end
			local absAngleOppDirGoal = math.abs(geom.normalizeAngle(
					opp.dir - (World.Geometry.FriendlyGoal - opp.pos):angle()))
			local ratingAbsAngleOppDirGoal = Rating.valueToRating(absAngleOppDirGoal, 60 * math.pi/180, 20 * math.pi/180)
			dangerousness[opp] = rating * ratingAbsAngleOppDirGoal
		end
	end
	return dangerousness
end
Defense.rateVolleyGoalShotThreats = Cache.forFrame(rateVolleyGoalShotThreats)

local function rateProximityThreats()
	local dangerousness = {}
	for _,opp in ipairs(World.OpponentRobots) do
		dangerousness[opp] = 0.01 * Rating.valueToRating(opp.pos:distanceTo(World.Geometry.FriendlyGoal), World.Geometry.FieldHeightHalf, 0)
	end
	return dangerousness
end

local function rateOpponentDangerousness()
	local passThreats = ratePassThreats()
	local goalThreats = rateVolleyGoalShotThreats()
	local proximityThreats = rateProximityThreats()

	local dangerousness = {}
	for _,opp in ipairs(World.OpponentRobots) do
		local passDangerousness = passThreats[opp] or 0
		local goalDangerousness = goalThreats[opp] or 0
		local proximityDangerousness = proximityThreats[opp]
		dangerousness[opp] = math.max(passDangerousness, math.max(goalDangerousness, proximityDangerousness))
	end

	return dangerousness
end
Defense.rateOpponentDangerousness = Cache.forFrame(rateOpponentDangerousness)

local function rateOpponentPassViability()
	if amun.isDebug then
		debug.push("Util Defense")
		debug.push("passViability")
	end

	local passViability = {} -- opponent -> rating

	local ballPos = World.Ball.pos + World.Ball.speed/2
	for _, opp in ipairs(World.OpponentRobots) do

		-- ignore the ball owner
		if opp.pos:distanceToSq(ballPos) < 0.5 then
			passViability[opp] = 0
			goto continue
		end

		-- ignore opponents close to enemy defense area
		if opp.pos.y > G.FieldHeightHalf - G.DefenseHeight - 1 then
			passViability[opp] = 0
			goto continue
		end

		-- we can successfully intercept long passes more easily
		local distToBallOwner = opp.pos:distanceToSq(ballPos)
		local distToBallOwnerRating = Rating.valueToRating(distToBallOwner, 2*2, 5*5)

		-- we do not want the enemy to move the ball closer to our goal
		local distToGoal = opp.pos.y + opp.speed.y/2 + G.FieldHeightHalf
		local distToGoalRating = Rating.valueToRating(distToGoal, G.FieldHeight - G.DefenseHeight, G.DefenseHeight + 1)

		local rating = 0.6 * distToGoalRating + 0.4 * distToBallOwnerRating
		passViability[opp] = rating

		if amun.isDebug then
			debug.push(tostring(opp.id))
			debug.set("distToBallOwnerRating", distToBallOwnerRating)
			debug.set("distToGoalRating", distToGoalRating)
			debug.set("total rating", rating)
			debug.pop()
		end

		::continue::
	end

	if amun.isDebug then
		debug.pop()
		debug.pop()
	end

	return passViability
end
Defense.rateOpponentPassViability = Cache.forFrame(rateOpponentPassViability)

-- this function searches for a position between boundaryOne and boundaryTwo to which the robot will take
-- the shortest amount of time, up to a precision value, using a ternary algorithm
function Defense.findBestPointToBlockOpponentShot(robot, boundaryOne, boundaryTwo, timeToBoundaryOne, timeToBoundaryTwo, precision)
	-- time diff between the two bounds
	if math.abs(timeToBoundaryOne - timeToBoundaryTwo) < precision or
			boundaryOne:distanceTo(boundaryTwo) < 0.005 then
		return boundaryOne
	end

	-- calculate two new positions on the line
	local leftThird = (boundaryOne * 2 + boundaryTwo) / 3
	local rightThird = (boundaryOne + boundaryTwo * 2) / 3

	-- calculate time to the new positions
	local timeToLeftThird = Physics.robotTimeToPos(robot, leftThird, Vector(0, 0), false, false)
	local timeToRightThird = Physics.robotTimeToPos(robot, rightThird, Vector(0,0), false, false)

	-- depending on which time is smaller recursively call the function with new boundaries
	if timeToLeftThird < timeToRightThird then
		return Defense.findBestPointToBlockOpponentShot(robot, boundaryOne, rightThird, timeToBoundaryOne, timeToRightThird, precision)
	else
		return Defense.findBestPointToBlockOpponentShot(robot, leftThird, boundaryTwo, timeToLeftThird, timeToBoundaryTwo, precision)
	end
end

-- this function calculates a new position between boundaryOne and boundaryTwo regarding the oldPosition
function Defense.fastestPointInInterval(robot, boundaryOne, boundaryTwo, oldPos, precision, blockAlpha)
	-- time to the boundaries
	local timeToBoundaryOne = Physics.robotTimeToPos(robot, boundaryOne, Vector(0, 0), false, false)
	local timeToBoundaryTwo = Physics.robotTimeToPos(robot, boundaryTwo, Vector(0, 0), false, false)

	local newPos = Defense.findBestPointToBlockOpponentShot(robot, boundaryOne, boundaryTwo, timeToBoundaryOne, timeToBoundaryTwo, precision)
	if oldPos then
		oldPos = oldPos:nearestPosOnLine(boundaryOne, boundaryTwo)
	else
		oldPos = newPos
	end

	-- don't let the postion jump to much between frames
	return newPos * blockAlpha + oldPos * (1-blockAlpha)
end

return Defense
