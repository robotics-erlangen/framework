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


function Defense:init()
	self._manmarkTargets           = {} -- opponent -> rating (= how dangerous this robot is)
	self._unassignedManmarkTargets = {} -- opponent -> rating
	self._manmarkAssignments       = {} -- opponent -> defender
	self._ballInOurHalf = true

	local countersidePosLeft  = Vector(-World.Geometry.FieldWidthHalf, 0)
	local countersidePosRight = Vector( World.Geometry.FieldWidthHalf, 0)
	self._countersideTargetLeft  = {pos = UtilDefense.centerBackPos(countersidePosLeft )}
	self._countersideTargetRight = {pos = UtilDefense.centerBackPos(countersidePosRight)}
	self._ballIsLeft = true
end

function Defense:_updateManmarkTargets()
	local closestOppToBall, closestOppToBallDist =
		UtilDefense.getClosestRobot(World.OpponentRobots, World.Ball.pos)

	local newManmarkTargets = {}
	local dangerousness = UtilDefense.rateOpponentDangerousness()
	for _, robot in ipairs(World.OpponentRobots) do
		local alreadyTargeted = self._manmarkTargets[robot] ~= nil

		-- consider the direction of the opponents
		local extrapolatedYPos = robot.pos.y + robot.speed.y * 0.5

		-- don't follow the opponents into their own field half
		local maxYPos = alreadyTargeted	and World.Geometry.FieldHeight / 6 or 0
		if extrapolatedYPos > maxYPos then
			goto continue
		end

		-- don't mark the opponent who is the closest to the ball
		if robot == closestOppToBall and closestOppToBallDist < 0.4 then
			goto continue
		end

		-- if in STOP, don't mark opponents who are close to the stop circle
		local stopCircleMarkRadius = alreadyTargeted and 0.6 or 0.75
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
	self._manmarkTargets = newManmarkTargets
	self._unassignedManmarkTargets = table.copy(self._manmarkTargets)

	for robot, dangerousness in pairs(self._manmarkTargets) do
		debug.set("Dangerousness/" .. tostring(robot.id), dangerousness)
		local color = vis.fromTemperature(dangerousness)
		vis.addCircle("tr/defense: Dangerousness", robot.pos, 0.2, color, true)
	end
end

function Defense:_nextManmarkAssignment(defenders)
	local bestRating = -math.huge
	local bestTarget = nil
	local bestDefender = nil

	if #defenders == 0 then
		return
	end

	-- search for the opponent with the highest rating
	-- if a defender marked it in the previous frame, add a bonus to the rating and assign
	for target, rating in pairs(self._unassignedManmarkTargets) do
		local prevManmark = self._manmarkAssignments[target]
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
		end
	end

	-- assign (if not already done)
	if bestTarget then
		if not bestDefender then
			local markPos = UtilDefense.manMarkPos(bestTarget)
			bestDefender = UtilDefense.getClosestRobot(defenders, markPos)
		end
		self._unassignedManmarkTargets[bestTarget] = nil
		self._manmarkAssignments[bestTarget] = bestDefender
	end
	return bestTarget, bestDefender
end

function Defense:_assignDefenders()
    if Referee.isKickoffState() or Referee.isNonGameStage() then
        return
    end

	local defenders = table.keys(self._inbox.defenderFlag())

	self._ballIsLeft = self._ballIsLeft and World.Ball.pos.x < 0.5 or World.Ball.pos.x < -0.5

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
	local needSecondDefaultCB = needDefaultCB and self._ballInOurHalf and not needCountersideCB
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
	local zonePosLeft = Vector(-World.Geometry.FieldWidthHalf/2, -World.Geometry.FieldHeightHalf/3)
	local zonePosRight = Vector(World.Geometry.FieldWidthHalf/2, -World.Geometry.FieldHeightHalf/3)
	local zonePosOne = self._ballIsLeft and zonePosRight or zonePosLeft
	local zonePosTwo = self._ballIsLeft and zonePosLeft or zonePosRight
	local zoneDefenderOne = UtilDefense.getClosestRobot(defenders, zonePosOne)
	if zoneDefenderOne then
		table.removeValue(defenders, zoneDefenderOne)
		self._send.roleAssignment(zoneDefenderOne,
			{name = "ZoneDefense", params = zonePosOne})
	end
	local zoneDefenderTwo = UtilDefense.getClosestRobot(defenders, zonePosTwo)
	if zoneDefenderTwo then
		table.removeValue(defenders, zoneDefenderTwo)
		self._send.roleAssignment(zoneDefenderTwo,
			{name = "ZoneDefense", params = zonePosTwo})
	end
end


return Defense
