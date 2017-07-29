local Defense = {}

local Cache = require "../base/cache"
local Constants = require "../base/constants"
local Field = require "../base/field"
local geom = require "../base/geom"
local Referee = require "../base/referee"
local World = require "../base/world"
local Goal = require "observer/goal"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local CenterBack = require "task/centerback"
local Rating = require "util/rating"


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

	-- use the position at which the robot would break if it started immediately
	targetPos = Physics.robotBrakePos({pos = targetPos, speed = opponent.speed, radius = opponent.radius})

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

local function calculateBallPosition(distanceToDefenseArea, robot_radius)
	local targetPos, targetDir, isShot = Goal.predictShot()
	local targetWay = nil

	if isShot then
		local goalLineIntersection = geom.intersectLineLine(targetPos,
			targetDir, World.Geometry.FriendlyGoal, Vector(1, 0))
		if goalLineIntersection and targetDir.y < 0 and
				math.abs(goalLineIntersection.x) < World.Geometry.GoalWidth / 2 + 0.15 then
			-- FIXME: HACK FOR FLOATS
			targetPos, targetWay = Field.intersectRayDefenseArea(targetPos, targetDir,
				distanceToDefenseArea + robot_radius + 0.02 , false)
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
	return Field.intersectRayDefenseArea(targetPos, dir, dist) or CenterBack.defaultPos
end
Defense.centerBackPos = Cache.forFrame(centerBackPos)

-- if the ball will reach our defense area with at least that speed, stay defender
local DANGEROUS_BALL_SPEED = 3.0
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
		local angleOppGoalBall = (opp.pos - World.Geometry.FriendlyGoal):absoluteAngleDiff(
			futureBallPos - World.Geometry.FriendlyGoal)
		local angleBallOppGoal = (futureBallPos - opp.pos):absoluteAngleDiff(
			World.Geometry.FriendlyGoal - opp.pos)
		local angleOppGoalY = (opp.pos - World.Geometry.FriendlyGoal):absoluteAngleDiff(Vector(0, 1))
		local distOppGoal = opp.pos:distanceTo(World.Geometry.FriendlyGoal)

		local ratingAngleOppGoalBall = Rating.valueToRating(angleOppGoalBall, 0 * math.pi/180, 30 * math.pi/180)
		local ratingAngleBallOppGoal = Rating.valueToRating(angleBallOppGoal, 120 * math.pi/180, 80 * math.pi/180)
		local ratingAngleOppGoalY = Rating.valueToRating(angleOppGoalY, 85 * math.pi/180, 70 * math.pi/180)
		local ratingDistOppGoal = Rating.valueToRating(distOppGoal,
			World.Geometry.FieldHeight * 0.85, World.Geometry.FieldHeight * 0.4)

		local rating = ratingAngleOppGoalBall * ratingAngleBallOppGoal * ratingAngleOppGoalY * ratingDistOppGoal
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

return Defense
