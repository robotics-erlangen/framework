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
	self._manmarkTargets              = {} -- opponent -> rating (= how dangerous this robot is)
	self._unassignedManmarkTargets    = {} -- opponent -> rating
	self._allUnassignedManmarkTargets = {} -- opponent -> rating
	self._manmarkAssignments          = {} -- opponent -> defender
	self._previousManmarkAssignments  = {} -- opponent -> defender
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

local compareAngles = function(i1, i2)
	return i1.angle < i2.angle
end

function Defense:_updateManmarkTargets()
	local closestOppToBall, closestOppToBallDist =
		UtilDefense.getClosestRobot(World.OpponentRobots, World.Ball.pos)

	local newManmarkTargets = {}
	local dangerousness = UtilDefense.rateOpponentDangerousness()
	for _, robot in ipairs(World.OpponentRobots) do
		local alreadyTargeted = self._manmarkTargets[robot] ~= nil
		-- don't manmark if we are already dueling the robot
		-- the duel robot has to block the shot already
		local sender, msg = next(self._inbox.defendedOpponent())
		if msg == robot and sender.pos:distanceToLineSegment(msg.pos + Vector.fromAngle(msg.dir) * (msg.shootRadius + World.Ball.radius), World.Geometry.FriendlyGoal) < sender.radius then
			goto continue
		end
		-- consider the direction of the opponents
		local extrapolatedYPos = robot.pos.y + robot.speed.y * 0.5

		-- don't follow the opponents into their own field half
		local maxYPos = alreadyTargeted	and World.Geometry.FieldHeight / 6 or 0
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
		newManmarkTargets[robot] = dangerousness[robot]
::continue::
	end

	local targetAngles = {}
	for robot, rating in pairs(newManmarkTargets) do
		local angle = (robot.pos - World.Geometry.FriendlyGoal):angle()
		table.insert(targetAngles, {robot = robot, angle = angle, rating = rating})
	end
	table.sort(targetAngles, compareAngles)

	local groupStartAngle = -math.huge
	local groupRobots = {}
	local currentGroup = {}
	local maxDeltaAngle = 0.25 / World.Geometry.DefenseRadius
	for _, robotAngle in pairs(targetAngles) do
		if robotAngle.angle - groupStartAngle > maxDeltaAngle then
			groupStartAngle = robotAngle.angle
			if #currentGroup > 0 then
				table.insert(groupRobots, currentGroup)
				currentGroup = {}
			end
		end
		table.insert(currentGroup, robotAngle)
	end
	if #currentGroup > 0 then
		table.insert(groupRobots, currentGroup)
	end

	self._manmarkTargets = {}
	local ballAngle = (World.Ball.pos - World.Geometry.FriendlyGoal):angle()
	for _, group in ipairs(groupRobots) do
		local firstRobotAngle = group[1]
		local lastRobotAngle = group[#group]
		local defendedAngle = ballAngle < firstRobotAngle.angle and firstRobotAngle.angle or lastRobotAngle.angle

		local defendedDistance = math.huge
		local groupRating = 0
		for _, robotAngle in ipairs(group) do
			defendedDistance = math.min(defendedDistance,
				robotAngle.robot.pos:distanceTo(World.Geometry.FriendlyGoal))
			groupRating = math.max(groupRating, robotAngle.rating)
		end

		local defendedPos = Vector.fromAngle(defendedAngle) * defendedDistance + World.Geometry.FriendlyGoal
		local fakeRobot = {pos = defendedPos, radius = Constants.maxRobotRadius, speed = Vector(0, 0)}

		table.insert(self._manmarkTargets, {robot = fakeRobot, rating = groupRating, group = group})
	end

	-- self._manmarkTargets = newManmarkTargets
	self._unassignedManmarkTargets = table.copy(self._manmarkTargets)
	self._allUnassignedManmarkTargets = table.copy(dangerousness)

	for robot, rating in pairs(dangerousness) do
		debug.set("Dangerousness/" .. tostring(robot.id), rating)
		local color = vis.fromTemperature(rating)
		vis.addCircle("tr/defense: Dangerousness", robot.pos, 0.2, color, true)
	end
end

function Defense:_nextManmarkAssignment(defenders)
	local bestRating = -math.huge
	local bestTarget = nil
	local bestGroup = nil
	local bestId = nil
	local bestDefender = nil

	if #defenders == 0 then
		return
	end

	-- search for the opponent with the highest rating
	-- if a defender marked it in the previous frame, add a bonus to the rating and assign
	for id, entry in pairs(self._unassignedManmarkTargets) do
		local target = entry.robot
		local rating = entry.rating
		local group  = entry.group
		local prevManmark = self._previousManmarkAssignments[target]
		local assignedDefender = nil
		if prevManmark then
			for _,r in ipairs(defenders) do
				if r == prevManmark then
					rating = rating + 0.2
					assignedDefender = r
					break
				end
			end
		end
		if rating > bestRating then
			bestRating = rating
			bestTarget = target
			bestGroup = group
			bestId = id
		end
	end

	-- assign (if not already done)
	if bestTarget then
		if not bestDefender then
			local markPos = UtilDefense.manMarkPos(bestTarget)
			bestDefender = UtilDefense.getClosestRobot(defenders, markPos)
		end
		self._unassignedManmarkTargets[bestId] = nil
		for _,r in ipairs(bestGroup) do
			self._allUnassignedManmarkTargets[r] = nil
		end
		self._manmarkAssignments[bestTarget] = bestDefender
	end
	return bestTarget, bestDefender
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

	-- in corner kick states: assign a counterside centerback
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
	-- local zonePosOne = self._ballIsLeft and zonePosRight or self._zonePosLeft
	-- local zonePosTwo = self._ballIsLeft and zonePosLeft or self._zonePosRight
	-- local zoneDefenderOne = UtilDefense.getClosestRobot(defenders, zonePosOne)
	-- if zoneDefenderOne then
	-- 	table.removeValue(defenders, zoneDefenderOne)
	-- 	self._send.roleAssignment(zoneDefenderOne,
	-- 		{name = "ZoneDefense", params = zonePosOne})
	-- end
	-- local zoneDefenderTwo = UtilDefense.getClosestRobot(defenders, zonePosTwo)
	-- if zoneDefenderTwo then
	-- 	table.removeValue(defenders, zoneDefenderTwo)
	-- 	self._send.roleAssignment(zoneDefenderTwo,
	-- 		{name = "ZoneDefense", params = zonePosTwo})
	-- end

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

			local bestTarget = nil
			local bestRating = -math.huge
			for target, rating in pairs(self._allUnassignedManmarkTargets) do
				if self._lastMMCBTargets[target] then
					rating = rating + 0.1
				end
				if rating > bestRating then
					bestTarget = target
					bestRating = rating
				end
			end
			if bestTarget then
				local defensePos = UtilDefense.centerBackPos(bestTarget.pos)
				self._send.roleAssignment(defender, {name = "CenterBack", params = bestTarget})
				-- self._unassignedManmarkTargets[bestTarget] = nil
				self._allUnassignedManmarkTargets[bestTarget] = nil
				mmcbTargets[bestTarget] = true
			else
				break
			end
		end
	end
	self._lastMMCBTargets = mmcbTargets

end


return Defense
