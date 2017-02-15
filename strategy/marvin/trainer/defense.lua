local Defense = {}

local Constants = require "../base/constants"
local Field = require "../base/field"
local Referee = require "../base/referee"
local vis = require "../base/vis"
local World = require "../base/world"

local Robot = require "observer/robot"
local UtilDefense = require "util/defense"
local Rating = require "util/rating"


function Defense:init()
	self._manmarkTargets = {} -- opponent -> rating
	self._manmarkAssignments = {} -- opponent -> defender
	self._previousManmarkAssignments = {} -- opponent -> defender

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

		-- if the robot just shot the ball
		if Robot.hadBall(robot, 1.5) then
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

	if mostDangerousRobot then
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

function Defense:_assignDefenders()
	self._previousManmarkAssignments = table.copy(self._manmarkAssignments)
	self._manmarkAssignments = {}

	if Referee.isNonGameStage() then
		return
	end

	self:_updateManmarkTargets()

	local defenders = table.keys(self._inbox.defenderFlag())
	local nReservedDefenders = 0

	-- not in opponent corner attacks: assign a ball centerback
	local needDefaultCB = not Referee.isDefensiveCornerKick()
	if needDefaultCB then
		local defaultCB = UtilDefense.getClosestRobot(defenders, UtilDefense.centerBackPos(World.Ball.pos))
		if defaultCB then
			table.removeValue(defenders, defaultCB)
			self._send.roleAssignment(defaultCB,
				{name = "CenterBack", params = { World.Ball }})
		end
	end

	self:_assignManmarkDefenders(defenders, nReservedDefenders)

	-- assign zone defenders if there are not enough opponents to manmark
	self._ballIsLeft = self._ballIsLeft and World.Ball.pos.x < 0.5 or World.Ball.pos.x < -0.5
	if not Referee.isStopState() then
		local zonePosOne = self._ballIsLeft and self._zonePosRight or self._zonePosLeft
		local zonePosTwo = self._ballIsLeft and self._zonePosLeft or self._zonePosRight
		local zoneDefenderPosOne = self._ballIsLeft and self._zoneDefenderPosRight or self._zoneDefenderPosLeft
		local zoneDefenderPosTwo = self._ballIsLeft and self._zoneDefenderPosLeft or self._zoneDefenderPosRight
		local zoneDefenderOne = UtilDefense.getClosestRobot(defenders, zoneDefenderPosOne)
		if zoneDefenderOne and self:_checkZoneDefender(zonePosOne) then
			table.removeValue(defenders, zoneDefenderOne)
			self._send.roleAssignment(zoneDefenderOne,
				{name = "ZoneDefense", params = { zoneDefenderPosOne }})
		end
		local zoneDefenderTwo = UtilDefense.getClosestRobot(defenders, zoneDefenderPosTwo)
		if zoneDefenderTwo and self:_checkZoneDefender(zonePosTwo) then
			table.removeValue(defenders, zoneDefenderTwo)
			self._send.roleAssignment(zoneDefenderTwo,
				{name = "ZoneDefense", params = { zoneDefenderPosTwo }})
		end
	end
end


return Defense
