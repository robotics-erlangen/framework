local Defense = {}

local Constants = require "../base/constants"
local debug = require "../base/debug"
local Field = require "../base/field"
local Referee = require "../base/referee"
local World = require "../base/world"
local debug = require "../base/debug"
local vis = require "../base/vis"

local CenterBack = require "task/centerback"
local Robot = require "observer/robot"
local UtilDefense = require "util/defense"
local Rating = require "util/rating"


function Defense:init()
	self._dangerousness = {} -- opponent -> rating
	self._manmarkAssignments = {} -- opponent -> defender
	self._previousManmarkAssignments = {} -- opponent -> defender
	self._manmarkGroups	= {} -- (robots = {opponent}, rating)
	self._partners = {} -- opponent -> opponent


	self._ballInOurHalf = true

	local countersidePosLeft  = Vector(-World.Geometry.FieldWidthHalf, 0)
	local countersidePosRight = Vector( World.Geometry.FieldWidthHalf, 0)
	self._countersideTargetLeft  = {pos = UtilDefense.centerBackPos(countersidePosLeft )}
	self._countersideTargetRight = {pos = UtilDefense.centerBackPos(countersidePosRight)}
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

	self._lastMMCBTargets = {} -- opponent -> bool
end

local compareDists = function(i1, i2)
	return i1.dist < i2.dist
end

function Defense:_updateManmarkTargets()
	local closestOppToBall, closestOppToBallDist =
		UtilDefense.getClosestRobot(World.OpponentRobots, World.Ball.pos)

	local newManmarkTargets = {}
	self._dangerousness = UtilDefense.rateOpponentDangerousness()

	for robot, rating in pairs(self._dangerousness) do
		debug.set("Dangerousness/" .. tostring(robot.id), rating)
		local color = vis.fromTemperature(rating)
		vis.addCircle("tr/defense: Dangerousness", robot.pos, 0.2, color, true)
	end

	for _, robot in ipairs(World.OpponentRobots) do
		local alreadyTargeted = self._previousManmarkAssignments[robot] ~= nil
		-- don't manmark if we are already dueling the robot
		-- the duel robot has to block the shot already
		local sender, msg = next(self._inbox.defendedOpponent())
		if msg == robot and sender.pos:distanceToLineSegment(msg.pos + Vector.fromAngle(msg.dir) * (msg.shootRadius + World.Ball.radius), World.Geometry.FriendlyGoal) < sender.radius then
			goto continue
		end
		-- consider the direction of the opponents
		local extrapolatedYPos = robot.pos.y + robot.speed.y * 0.5

		-- don't follow the opponents into their own field half
		local maxYPos = alreadyTargeted	and World.Geometry.FieldHeightHalf / 2 or World.Geometry.FieldHeightHalf / 6
		if extrapolatedYPos > maxYPos then
			goto continue
		end

		-- if in STOP, don't mark opponents who are close to the stop circle
		local stopCircleMarkRadius = alreadyTargeted and 0.7 or 0.85
		if Referee.isStopState() and robot.pos:distanceTo(World.Ball.pos) < stopCircleMarkRadius then
			goto continue
		end

		-- if the robot just shot the ball
		if Robot.hadBall(robot, 1.5) then
			goto continue
		end

		-- otherwise, target the opponent
		newManmarkTargets[robot] = self._dangerousness[robot]
::continue::
	end

	local list = {}
	for robot, rating in pairs(newManmarkTargets) do
		table.insert(list, {robot = robot, rating = rating})
	end

	local maxDist = 0.5
	local listWithDist = {}
	for i, first in ipairs(list) do
		for j = i+1, #list do
			local second = list[j]
			local dist = first.robot.pos:distanceTo(second.robot.pos)
			if self._partners[first] == second then
				dist = dist - 0.1
			end
			if dist < maxDist then
				table.insert(listWithDist, {a = first, b = second, dist = dist})
			end
		end
	end
	table.sort(listWithDist, compareDists)

	local groups = {}
	local partners = {}
	for _, entry in ipairs(listWithDist) do
		if not partners[entry.a] and not partners[entry.b] then
			local rating = math.max(entry.a.rating, entry.b.rating)
			table.insert(groups, {robots = {entry.a.robot, entry.b.robot}, rating = rating})
			partners[entry.a] = entry.b
			partners[entry.b] = entry.a
		end
	end
	self._partners = partners

	for _, entry in ipairs(list) do
		if not partners[entry] then
			table.insert(groups, {robots = {entry.robot}, rating = entry.rating})
		end
	end

	self._manmarkGroups = groups
end

function Defense:_nextManmarkAssignment(defenders)
	if #defenders == 0 then
		return
	end

	local bestGroup = nil
	local bestRating = -math.huge
	for _, group in ipairs(self._manmarkGroups) do
		local additionalScore = 0
		local scoreStep = 0.2 / #group.robots
		for _, defender in ipairs(defenders) do
			for _, opponent in ipairs(group.robots) do
				if self._previousManmarkAssignments[opponent] == defender then
					additionalScore = additionalScore + scoreStep
				end
			end
			if additionalScore > 0 then
				break
			end
		end
		local rating = group.rating + additionalScore
		if rating > bestRating then
			bestRating = rating
			bestGroup = group
		end
	end

	if bestGroup then
		local manMarkPos = UtilDefense.manMarkPos(UtilDefense.manMarkFakeRobot(bestGroup.robots))
		local bestDefender = UtilDefense.getClosestRobot(defenders, manMarkPos)
		for _, opponent in ipairs(bestGroup.robots) do
			self._manmarkAssignments[opponent] = bestDefender
		end
		table.removeValue(self._manmarkGroups, bestGroup)
		return bestGroup.robots, bestDefender
	end

	return nil, nil
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

function Defense:_assignDefenders()
	self._previousManmarkAssignments = table.copy(self._manmarkAssignments)
	self._manmarkAssignments = {}

    if Referee.isKickoffState() or Referee.isNonGameStage() then
        return
    end

	local defenders = table.keys(self._inbox.defenderFlag())

	self._ballIsLeft = self._ballIsLeft and World.Ball.pos.x < 0.5 or World.Ball.pos.x < -0.5

	-- not in opponent corner attacks: assign a ball centerback
	local needDefaultCB = not Referee.isDefensiveCornerKick()
	if needDefaultCB then
		local defaultCB = UtilDefense.getClosestRobot(defenders, UtilDefense.centerBackPos(World.Ball.pos))
		if defaultCB then
			table.removeValue(defenders, defaultCB)
			self._send.roleAssignment(defaultCB,
				{name = "CenterBack", params = World.Ball})
		end
	end

	-- in stop states: assign a counterside centerback
	local needCountersideCB = Referee.isStopState()
	if needCountersideCB then
		local countersideTarget = self._ballIsLeft
			and self._countersideTargetRight or self._countersideTargetLeft
		local countersideCB, d = UtilDefense.getClosestRobot(defenders, countersideTarget.pos)
		if countersideCB then
			table.removeValue(defenders, countersideCB)
			self._send.roleAssignment(countersideCB,
				{name = "CenterBack", params = countersideTarget})
		end
	end

	-- in corner kick states: assign a sameside centerback
	local needSamesideCB = Referee.isDefensiveCornerKick() and World.RefereeState ~= "Stop"
	if needSamesideCB then
		local countersideTarget = self._ballIsLeft
			and self._countersideTargetLeft or self._countersideTargetRight
		local countersideCB, d = UtilDefense.getClosestRobot(defenders, countersideTarget.pos)
		if countersideCB then
			table.removeValue(defenders, countersideCB)
			self._send.roleAssignment(countersideCB,
				{name = "CenterBack", params = countersideTarget})
		end
	end


	-- update the list of manmarkTargets
	self:_updateManmarkTargets()

	-- assign the first ManMark
	local manmarkTarget, manmarker = self:_nextManmarkAssignment(defenders)
	if manmarkTarget and manmarker then
		table.removeValue(defenders, manmarker)
		self._send.roleAssignment(manmarker,
			{name = "ManMark", params = manmarkTarget})
	end

	-- update ball in our half (hysteresis)
	self._ballInOurHalf = self._ballInOurHalf and World.Ball.pos.y < 1 or World.Ball.pos.y < -1

	-- ball in our half: assign a second default centerback
	local needSecondDefaultCB = needDefaultCB and self._ballInOurHalf and not Referee.isStopState()
	if needSecondDefaultCB then
		local defaultCB = UtilDefense.getClosestRobot(defenders, UtilDefense.centerBackPos(World.Ball.pos))
		if defaultCB then
			table.removeValue(defenders, defaultCB)
			self._send.roleAssignment(defaultCB,
				{name = "CenterBack", params = World.Ball})
		end
	end

	-- assign the remaining manmarks
	while true do
		local manmarkTarget, manmarker = self:_nextManmarkAssignment(defenders)
		if not manmarkTarget or not manmarker then
			break
		end

		table.removeValue(defenders, manmarker)
		self._send.roleAssignment(manmarker,
			{name = "ManMark", params = manmarkTarget})
	end

	-- assign zone defenders if there are not enough opponents to manmark
	local zonePosOne = self._ballIsLeft and self._zonePosRight or self._zonePosLeft
	local zonePosTwo = self._ballIsLeft and self._zonePosLeft or self._zonePosRight
	local zoneDefenderPosOne = self._ballIsLeft and self._zoneDefenderPosRight or self._zoneDefenderPosLeft
	local zoneDefenderPosTwo = self._ballIsLeft and self._zoneDefenderPosLeft or self._zoneDefenderPosRight
	local zoneDefenderOne = UtilDefense.getClosestRobot(defenders, zoneDefenderPosOne)
	if zoneDefenderOne and self:_checkZoneDefender(zonePosOne) then
		table.removeValue(defenders, zoneDefenderOne)
		self._send.roleAssignment(zoneDefenderOne,
			{name = "ZoneDefense", params = zoneDefenderPosOne})
	end
	local zoneDefenderTwo = UtilDefense.getClosestRobot(defenders, zoneDefenderPosTwo)
	if zoneDefenderTwo and self:_checkZoneDefender(zonePosTwo) then
		table.removeValue(defenders, zoneDefenderTwo)
		self._send.roleAssignment(zoneDefenderTwo,
			{name = "ZoneDefense", params = zoneDefenderPosTwo})
	end

	-- in stop states: assign a centerback to follow the most dangerous unmarked opponent
	local mmcbTargets = {}
	if Referee.isStopState() then
		while #defenders > 0 do
			local defender = table.remove(defenders)

			local bestRating = -math.huge
			local bestTarget = nil
			for r, rating in pairs(self._dangerousness) do
				if self._lastMMCBTargets[r] then
					rating = rating + 0.1
				end
				if not self._manmarkAssignments[r] and rating > bestRating then
					bestRating = rating
					bestTarget = r
				end
			end
			if not bestTarget then
				break
			end

			mmcbTargets[bestTarget] = defender
			self._manmarkAssignments[bestTarget] = defender
			self._send.roleAssignment(defender, {name = "CenterBack", params = bestTarget})
		end
	end
	self._lastMMCBTargets = mmcbTargets

end


return Defense
