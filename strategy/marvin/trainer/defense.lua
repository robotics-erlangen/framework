local Defense = {}

local Constants = require "../base/constants"
local Field = require "../base/field"
local geom = require "../base/geom"
local Referee = require "../base/referee"
local vis = require "../base/vis"
local World = require "../base/world"

local Ball = require "observer/ball"
local Goal = require "observer/goal"
local ObserverRobot = require "observer/robot"
local Physics = require "observer/physics"
local UtilDefense = require "util/defense"
local Rating = require "util/rating"

local G = World.Geometry


function Defense:init()
	self._manmarkTargets = {} -- opponent -> rating
	self._manmarkAssignments = {} -- opponent -> defender
	self._centerbackAssignments = {}

	self._piggyTargets = {} -- opponent -> rating
	self._piggyAssignments = {} -- opponent -> defender

	self._previousManmarkAssignments = {} -- opponent -> defender
	self._previousPiggyAssignments = {} -- opponent -> defender
	self._previousBallCenterbacks = {}

	self._ballIsLeft = true

	local zonePosLeft = Vector(-World.Geometry.FieldWidthHalf/2, -World.Geometry.FieldHeightHalf/4)
	local zonePosRight = Vector(World.Geometry.FieldWidthHalf/2, -World.Geometry.FieldHeightHalf/4)
	self._zonePosLeft = zonePosLeft
	self._zonePosRight = zonePosRight
	self._zoneDefenderPosLeft = UtilDefense.manMarkPos(
		{pos = zonePosLeft, radius = Constants.maxRobotRadius, speed = Vector(0, 0)})
	self._zoneDefenderPosRight = UtilDefense.manMarkPos(
		{pos = zonePosRight, radius = Constants.maxRobotRadius, speed = Vector(0, 0)})
	self._zonePosHysteresis = {}
	self._centerbackIntersectionsRemoved = {false, false}
end

function Defense:_updateManmarkTargets()
	local dangerousness = UtilDefense.rateOpponentDangerousness()

	for robot, rating in pairs(dangerousness) do
		vis.addCircle("tr/defense: Dangerousness", robot.pos, 0.2, vis.fromTemperature(rating), true)
	end

	for _, robot in ipairs(World.OpponentRobots) do
		local alreadyTargeted = self._previousManmarkAssignments[robot] ~= nil

		-- if we are already dueling the robot
		-- the duel robot has to block the shot already
		local sender, msg = next(self._inbox.defendedOpponent())
		if msg == robot and sender.pos:distanceToLineSegment(msg.pos + Vector.fromAngle(msg.dir) * (msg.shootRadius + World.Ball.radius), World.Geometry.FriendlyGoal) < sender.radius then
			goto continue
		end

		-- if the robot is the (not aggressive) opponent keeper
		local extraDist = alreadyTargeted and 0.2 or 0.4
		if robot == World.OpponentKeeper and Field.isInOpponentDefenseArea(robot.pos, extraDist) then
			goto continue
		end

		-- if in STOP, don't mark opponents who are close to the stop circle
		local stopCircleMarkRadius = alreadyTargeted and 0.7 or 0.85
		if Referee.isStopState() and robot.pos:distanceTo(World.Ball.pos) < stopCircleMarkRadius then
			goto continue
		end

		-- otherwise, target the opponent
		self._manmarkTargets[robot] = dangerousness[robot]
::continue::
	end
end

function Defense:_nextManmarkAssignment(defenders)
	if #defenders == 0 then
		return
	end

	local mostDangerousRobot = nil
	local highestDangerousness = -math.huge
	for robot, dangerousness in pairs(self._manmarkTargets) do
		for _, defender in ipairs(defenders) do
			if self._previousManmarkAssignments[robot] == defender then
				dangerousness = dangerousness + 0.2
			end
		end
		if dangerousness > highestDangerousness then
			highestDangerousness = dangerousness
			mostDangerousRobot = robot
		end
	end

	if mostDangerousRobot and highestDangerousness > 0 then
		local targetBot = mostDangerousRobot
		local bestDefender = targetBot

		local intersectionDefenseArea = Field.intersectRayDefenseArea(targetBot.pos, G.FriendlyGoal - targetBot.pos, 0.2, true)
		local manMarkPos = UtilDefense.manMarkPos(mostDangerousRobot)
		if intersectionDefenseArea then
			-- manmark should quickly move into the goalline
			-- whichever robot is close to the goalline and close to the defense area is preferred
			local bestDistance = math.huge
			for _, bot in ipairs(defenders) do
				local posOnGoalLine, distanceToGoalLine = bot.pos:orthogonalProjection(intersectionDefenseArea, targetBot.pos)
				distanceToGoalLine = math.abs(distanceToGoalLine)

				if Field.isInDefenseArea(posOnGoalLine, 0.05, true) then
					posOnGoalLine = Field.intersectRayDefenseArea(posOnGoalLine, targetBot.pos-posOnGoalLine, 0.2, true) or posOnGoalLine
				end

				-- a figurative distance, the distance to the goalline is weighted more than the distance to the manMarkPos
				-- this is because a manMark will first try to intercept the goal line
				local totalDistance = distanceToGoalLine * 1.5 + posOnGoalLine:distanceTo(manMarkPos)
				if self._previousManmarkAssignments[targetBot] == bot then
					totalDistance = 0.75 * totalDistance
				end

				if self._previousPiggyAssignments[mostDangerousRobot] == bot then
					totalDistance = totalDistance * 1.2
				end

				if totalDistance < bestDistance then
					bestDistance = totalDistance
					bestDefender = bot
				end
			end
		else
			bestDefender = UtilDefense.getClosestRobot(defenders, manMarkPos)
		end


		self._manmarkAssignments[mostDangerousRobot] = bestDefender
		self._manmarkTargets[mostDangerousRobot] = nil

		return mostDangerousRobot, bestDefender
	end
end


function Defense:_checkZoneDefender(zonePos)
	local rating = 0
	for robot, _ in pairs(self._manmarkAssignments) do
		local dist = zonePos:distanceTo(robot.pos)
		rating = rating + Rating.valueToRating(dist, World.Geometry.FieldHeightHalf / 3, 0)
	end
	local decision = self._zonePosHysteresis[zonePos] and rating < 0.6 or rating < 0.3 or not Referee.isStopState()
	self._zonePosHysteresis[zonePos] = decision
	return decision
end

function Defense:_assignManmarkDefenders(defenders, nReservedDefenders)
	while #defenders - nReservedDefenders > 0 do
		local manmarkTarget, manmarker = self:_nextManmarkAssignment(defenders)
		if not manmarkTarget or not manmarker then
			break
		end

		table.removeValue(defenders, manmarker)
		self._send.roleAssignment(manmarker,
			{name = "ManMark", params = { manmarkTarget }})
	end
end

function Defense:_updatePiggyTargets()
	local passViability = UtilDefense.rateOpponentPassViability() -- opponent -> rating
	for robot, rating in pairs(passViability) do
		vis.addCircle("tr/defense: passViability", robot.pos, 0.2, vis.fromTemperature(rating), true)
	end

	-- remove targets with lowest rating
	for opp, rating in pairs(passViability) do
		if rating < 0.1 then
			passViability[opp] = nil
		end
	end

	self._piggyTargets = passViability
end

local function determineNumberOfPiggies(defenderCount, manmarkTargets, piggyTargets)
	local dangerousnessThreshold
	local viabilityThreshold

	if Referee.isKickoffState() then
		return 0
	end

	-- prioritize manmarks over piggies when in own field half
	-- TODO hysteresis

	if World.Ball.pos.y < 0 then
		dangerousnessThreshold = 0.3
		viabilityThreshold = 0.8
	else
		dangerousnessThreshold = 0.8
		viabilityThreshold = 0.3
	end

	local piggieCount = 0
	if not Ball.ballHeadingForGoal(World.Ball, true)
			or World.Ball.speed:length() < 3 or (World.Ball.pos + World.Ball.speed).y > -1 then
		local nRelevantManMarkTargets = 0
		for _, dangerousness in pairs(manmarkTargets) do
			if dangerousness > dangerousnessThreshold then
				nRelevantManMarkTargets = nRelevantManMarkTargets + 1
			end
		end
		piggieCount = math.max(0, defenderCount - nRelevantManMarkTargets)
	end

	if piggieCount > 0 then
		local nRelevantPiggyTargets = 0
		for _, viability in pairs(piggyTargets) do
			if viability > viabilityThreshold then
				nRelevantPiggyTargets = nRelevantPiggyTargets + 1
			end
		end
		piggieCount = math.min(piggieCount, nRelevantPiggyTargets)
	end

	return piggieCount
end

local function findMostViableTarget(piggyTargets, defenders, previousAssignments)
	local highestViability = -math.huge
	local mostViableTarget = nil
	for target, viability in pairs(piggyTargets) do

		-- hysteresis
		if previousAssignments[target] then
			for _, defender in ipairs(defenders) do
				if previousAssignments[target] == defender then
					viability = viability + 0.3
				end
			end
		end

		if viability > highestViability then
			highestViability = viability
			mostViableTarget = target
		end

	end

	return mostViableTarget
end

function Defense:_assignPiggies(defenders, nPiggies)
	-- assign piggies
	while #defenders > 0 and nPiggies > 0 do

		local target = findMostViableTarget(self._piggyTargets, defenders, self._previousPiggyAssignments)
		if not target then
			break
		end

		self._piggyTargets[target] = nil

		local piggyPos = UtilDefense.piggyPos(target)
		local piggy = UtilDefense.getClosestRobot(defenders, piggyPos)

		if not piggy or not target then
			break
		end

		self._piggyAssignments[target] = piggy
		table.removeValue(defenders, piggy)
		self._send.roleAssignment(piggy,
			{name = "Piggy", params = { target }})
		nPiggies = nPiggies - 1
	end
end

-- inserts tables of: way, pos, startPos, startDirection of the ray into result
function Defense:_createIntersections(result, pos, direction, radius, index)
	local lastRemoved = self._centerbackIntersectionsRemoved[index]
	self._centerbackIntersectionsRemoved[index] = false
	local MAX_DEFENSE_DIST = 5
	local intersections = Field.intersectionsRayDefenseArea(pos, direction, radius, true)
	if intersections[1] and intersections[2] then
		if intersections[1].pos:distanceToSq(pos) > intersections[2].pos:distanceToSq(pos) then
			intersections[1], intersections[2] = intersections[2], intersections[1]
		end
		local maxDistance = lastRemoved and 0.3 or 0.2
		local value = direction:copy():setLength(1).y
		local minFlatness = lastRemoved and 0.3 or 0.2
		if intersections[1].pos:distanceToSq(intersections[2].pos) < maxDistance * maxDistance or
				value < minFlatness and intersections[2].sec == 3 then
			intersections[2] = nil
			self._centerbackIntersectionsRemoved[index] = true
		end
	end
	if intersections[1] then
		if intersections[1].pos:distanceToSq(pos) > MAX_DEFENSE_DIST * MAX_DEFENSE_DIST then
			return
		end
		table.insert(result, {startPos = pos, startDirection = direction,
			pos = intersections[1].pos, way = intersections[1].way})
	end
	if intersections[2] then
		local toDefenseDist = pos:distanceTo(intersections[1].pos)
		local insidePos = pos + direction:copy():setLength(toDefenseDist + 0.03)
		table.insert(result, {startPos = insidePos, startDirection = direction,
			pos = intersections[2].pos,way = intersections[2].way})
	end
end

function Defense:_assignBallCenterbacks(defenders)
	local ROBOT_TIME_MARGIN_LOW = 0
	local ROBOT_TIME_MARGIN_HIGH = 0.1

	if #defenders == 0 then
		return
	end

	local ballDistance = Field.distanceToFriendlyDefenseArea(World.Ball.pos, 0)
	local distanceToDefenseArea = UtilDefense.centerBackDistanceToDefenseArea()
	local defenseExtraRadius = distanceToDefenseArea + Constants.maxRobotRadius
	local intersectionInfos = {}
	if (ballDistance < 1 and World.Ball.speed:length() > 0.2) or not Ball.isSlowBall() then
		self:_createIntersections(intersectionInfos, World.Ball.pos, World.Ball.speed, defenseExtraRadius, 1)
	end
	local predictedPos, predictedDir, isShot, _, isDribbling = Goal.predictShot()
	if isShot and (predictedPos ~= World.Ball.pos or predictedDir ~= World.Ball.speed) then
		local numBefore = #intersectionInfos
		self:_createIntersections(intersectionInfos, predictedPos, predictedDir, defenseExtraRadius, 2)
		if #intersectionInfos > numBefore then
			intersectionInfos[numBefore + 1].resetSpeed = true
			intersectionInfos[numBefore + 1].isDribbling = isDribbling
		end
	end
	-- remove exit point of predictshot if enough points are available
	if intersectionInfos[4] then
		intersectionInfos[4] = nil
	end

	-- go over all intersections
	self._centerbackAssignments = {}
	local timeSum = 0
	local currentBall = World.Ball
	for _, info in ipairs(intersectionInfos) do
		local intersection = geom.intersectLineLine(World.Geometry.FriendlyGoal, Vector(1, 0),
			info.startPos, info.startDirection)
		local intersectsGoal = intersection and math.abs(intersection.x) < World.Geometry.GoalWidth / 2 + 0.1
		if info.resetSpeed then
			timeSum = timeSum + Physics.ballTravelTime(currentBall, currentBall.pos:distanceTo(info.startPos))
			currentBall = {pos = info.startPos, speed = Vector(Constants.maxBallSpeed, 0),
				maxSpeed = Constants.maxBallSpeed, posZ = 0, initSpeedZ = 0}
		end
		local rollTime = timeSum + Physics.ballTravelTime(currentBall, currentBall.pos:distanceTo(info.pos))
		if info.isDribbling then
			rollTime = rollTime + 0.4
		end
		if rollTime == math.huge then
			-- no other intersection can be reached by the ball
			break
		end
		local closestRobot = UtilDefense.getClosestRobot(defenders, info.pos)
		local robotTime = ObserverRobot.timeAroundDefenseAreaByWay(closestRobot, nil, info.pos, info.way, defenseExtraRadius, true)
		local robotTimeMargin = table.contains(self._centerbackAssignments, closestRobot) and
			ROBOT_TIME_MARGIN_LOW or ROBOT_TIME_MARGIN_HIGH
		if robotTime + robotTimeMargin < rollTime or
				robotTime < rollTime and rollTime < ROBOT_TIME_MARGIN_HIGH or
				#self._centerbackAssignments == 0 and intersectsGoal then
			table.insert(self._centerbackAssignments, closestRobot)
			table.removeValue(defenders, closestRobot)
			self._send.roleAssignment(closestRobot,
				{name = "CenterBack", params = { pos = info.startPos, dir = info.startDirection, time = rollTime }})
			if not amun.isPerformanceMode then
				vis.addCircle("tr/defense: ball intersection", info.startPos, 0.08, vis.colors.yellow)
				vis.addCircle("tr/defense: ball intersection", info.pos, 0.12, vis.colors.red)
				vis.addPath("tr/defense: ball intersection", {info.startPos, info.pos}, vis.colors.red)
			end
		end
	end

	-- assign default centerbacks
	if #intersectionInfos == 0 then
		-- not in opponent corner attacks: assign a ball centerback
		local needDefaultCB = not Referee.isDefensiveCornerKick() and not Referee.isFriendlyFreeKickState()
		if needDefaultCB then
			local futureBallPosCB = UtilDefense.calculateBallPosition()
			local defaultCB = UtilDefense.getClosestRobot(defenders, futureBallPosCB)
			if defaultCB then
				table.removeValue(defenders, defaultCB)
				self._send.roleAssignment(defaultCB,
					{name = "CenterBack", params = { pos = World.Ball.pos }})
			end
		end
	end
end

function Defense:_assignDefenders()
	self._previousManmarkAssignments = table.copy(self._manmarkAssignments)
	self._previousPiggyAssignments = table.copy(self._piggyAssignments)
	self._previousBallCenterbacks = table.copy(self._centerbackAssignments)
	self._manmarkAssignments = {}

	if Referee.isNonGameStage() then
		return
	end

	self:_updateManmarkTargets()
	self:_updatePiggyTargets()

	local defenders = table.keys(self._inbox.defenderFlag())

	-- if needDefaultCB then
	-- 	local volleyDangerousness = UtilDefense.rateVolleyGoalShotThreats()
	-- 	for _, robot in ipairs(World.OpponentRobots) do
	-- 		if volleyDangerousness[robot] and volleyDangerousness[robot] > 0.5 then
	-- 			for _ = 1,2 do
	-- 				local defaultCB = UtilDefense.getClosestRobot(defenders, UtilDefense.centerBackPos(World.Ball.pos))
	-- 				if defaultCB then
	-- 					table.removeValue(defenders, defaultCB)
	-- 					self._send.roleAssignment(defaultCB,
	-- 						{name = "CenterBack", params = { World.Ball }})
	-- 				end
	-- 			end
	-- 			break
	-- 		end
	-- 	end
	-- end

	self:_assignBallCenterbacks(defenders)

	local nPiggies = determineNumberOfPiggies(#defenders, self._manmarkTargets, self._piggyTargets)
	local nReservedDefenders = nPiggies

	self:_assignManmarkDefenders(defenders, nReservedDefenders)
	self:_assignPiggies(defenders, nPiggies)
end


return Defense
