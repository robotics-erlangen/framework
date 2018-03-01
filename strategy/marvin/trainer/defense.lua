local Defense = {}

local Constants = require "../base/constants"
local Field = require "../base/field"
local Referee = require "../base/referee"
local vis = require "../base/vis"
local World = require "../base/world"

local Ball = require "observer/ball"
local UtilDefense = require "util/defense"
local Rating = require "util/rating"
local CenterBackTask = require "task/centerback"


function Defense:init()
	self._manmarkTargets = {} -- opponent -> rating
	self._manmarkAssignments = {} -- opponent -> defender

	self._piggyTargets = {} -- opponent -> rating
	self._piggyAssignments = {} -- opponent -> defender

	self._previousManmarkAssignments = {} -- opponent -> defender
	self._previousPiggyAssignments = {} -- opponent -> defender

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
		local manMarkPos = UtilDefense.manMarkPos(mostDangerousRobot)
		local bestDefender = UtilDefense.getClosestRobot(defenders, manMarkPos)
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

function Defense:_assignManmarkDefenders(defenders)
	while #defenders > 0 do
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

	-- prioritize manmarks over piggies when in own field half
	-- TODO hysteresis

	if World.Ball.pos.y < 0 then
		dangerousnessThreshold = 0.5
		viabilityThreshold = 0.8
	else
		dangerousnessThreshold = 0.8
		viabilityThreshold = 0.3
	end

	local piggieCount = 0
	if not Ball.ballHeadingForGoal(World.Ball) then
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

local function findMostViableTarget(piggyTargets)
	local highestViability = -math.huge
	local mostViableTarget = nil
	for target, viability in pairs(piggyTargets) do
		if viability > highestViability then
			highestViability = viability
			mostViableTarget = target
		end
	end

	return mostViableTarget
end

function Defense:_assignPiggies(defenders)
	-- assign piggies
	local nPiggies = determineNumberOfPiggies(#defenders, self._manmarkTargets, self._piggyTargets)
	while nPiggies > 0 do
		local target = findMostViableTarget(self._piggyTargets)
		self._piggyTargets[target] = nil

		local piggy = UtilDefense.getClosestRobot(defenders, target.pos)

		if not piggy or not target then
			break
		end

		table.removeValue(defenders, piggy)
		self._send.roleAssignment(piggy,
			{name = "Piggy", params = { target }})
		nPiggies = nPiggies - 1
	end

	-- return the defenders that are left after assigning piggies
	return defenders
end

function Defense:_assignDefenders()
	self._previousManmarkAssignments = table.copy(self._manmarkAssignments)
	self._manmarkAssignments = {}

	if Referee.isNonGameStage() then
		return
	end

	self:_updateManmarkTargets()
	self:_updatePiggyTargets()

	local defenders = table.keys(self._inbox.defenderFlag())

	-- not in opponent corner attacks: assign a ball centerback
	local needDefaultCB = not Referee.isDefensiveCornerKick() and not Referee.isFriendlyFreeKickState()
	if needDefaultCB then
		local futureBallPos = UtilDefense.calculateBallPosition(CenterBackTask.distanceToDefenseArea(), 0.09)
		local defaultCB = UtilDefense.getClosestRobot(defenders, UtilDefense.centerBackPos(futureBallPos))
		if defaultCB then
			table.removeValue(defenders, defaultCB)
			self._send.roleAssignment(defaultCB,
				{name = "CenterBack", params = { World.Ball }})
		end
	end

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

	defenders = self:_assignPiggies(defenders)
	self:_assignManmarkDefenders(defenders)
end


return Defense
