local Defense = {}

local debug = require "../base/debug"
local Field = require "../base/field"
local Referee = require "../base/referee"
local World = require "../base/world"
local UtilDefense = require "util/defense"


local MIN_OPP_DIST_TO_BALL_FOR_MARKING = 0.4

function Defense:init()
    self._oppsToMark = {}
end

local function isVisible(robot)
	return robot.isVisible
end
local function distToFriendlyGoal(r1, r2)
	return r1.pos:distanceTo(World.Geometry.FriendlyGoal)
		< r2.pos:distanceTo(World.Geometry.FriendlyGoal)
end
local function nearestOppToBall()
	local ballPos = World.Ball.pos
	local nearestOppToBall
	local minDist = math.huge
	for _, opp in ipairs(World.OpponentRobots) do
		local dist = opp.pos:distanceTo(ballPos)
		if dist < minDist and dist < MIN_OPP_DIST_TO_BALL_FOR_MARKING then
			nearestOppToBall = opp
			minDist = dist
		end
	end
	return nearestOppToBall
end

-- these targets are required for the centerback task to compute a position
local countersideTargetLeft = { pos = Vector(-World.Geometry.FieldWidthHalf, 0) }
local countersideTargetRight = { pos = Vector(World.Geometry.FieldWidthHalf, 0) }
function Defense:_chooseManMarkAndCenterBacks()
    if Referee.isKickoffState() or Referee.isNonGameStage() then
        return
    end

	self._oppsToMark = table.filter(self._oppsToMark, isVisible)
	local nearestOppToBall = nearestOppToBall()
	for _, robot in ipairs(World.OpponentRobots) do
		local alreadyTargeted = table.contains(self._oppsToMark, robot)
		local maxYPos = alreadyTargeted
			and World.Geometry.FieldHeight / 4 or World.Geometry.FieldHeight / 6
		local minBallDist = alreadyTargeted	and 0.6 or 0.75
		local shouldMark = robot ~= nearestOppToBall and robot.pos.y < maxYPos and
			(not Referee.isStopState() or robot.pos:distanceTo(World.Ball.pos) > minBallDist)
		if alreadyTargeted and not shouldMark then
			table.removeValue(self._oppsToMark, robot)
		elseif not alreadyTargeted and shouldMark then
			table.insert(self._oppsToMark, robot)
		end
	end
	table.sort(self._oppsToMark, distToFriendlyGoal)

	local unassigned = table.keys(self._inbox.defenderFlag())
	local needCountersideCB = Referee.isStopState() and World.Ball.pos.y < 0
		and #unassigned - #self._oppsToMark >= 2
	-- cbs are "pure" if they defend the ball and are close to the defense area
	local pureCenterBacks = {}
	local pureCenterBacksArray = {}
	-- pure centerbacks are treated as unassigned until there is only 1 left
	local markedOpps = {}
	local defaultCenterBack, countersideCenterBack
	for robot, target in pairs(self._inbox.centerbackTarget()) do
		if target == World.Ball and
				Field.distanceToFriendlyDefenseArea(robot.pos, robot.radius) < 4*robot.radius then
			table.insert(pureCenterBacksArray, robot)
			pureCenterBacks[robot] = true
		elseif (target == countersideTargetLeft or target == countersideTargetRight) and needCountersideCB then
			countersideCenterBack = robot
			table.removeValue(unassigned, countersideCenterBack)
		elseif table.contains(self._oppsToMark, target) then
			markedOpps[target] = robot -- respect choice of task
			table.removeValue(unassigned, robot)
		end
	end
	debug.set("oppsToMark", self._oppsToMark)

	if #pureCenterBacksArray == 1 then
		defaultCenterBack = pureCenterBacksArray[1]
		table.removeValue(unassigned, defaultCenterBack)
	elseif #pureCenterBacksArray == 0 then
		table.sort(unassigned, distToFriendlyGoal)
		defaultCenterBack = table.remove(unassigned, 1)
	end
	for _, robot in ipairs(self._oppsToMark) do
		if #unassigned == 0 then
			break
		end
		if not markedOpps[robot] then
			local markPos = UtilDefense.manMarkPos(robot)
			table.sort(unassigned, function(r1, r2)
				return r1.pos:distanceTo(markPos) < r2.pos:distanceTo(markPos)
			end)
			local friendly = table.remove(unassigned, 1)
			markedOpps[robot] = friendly
			if pureCenterBacks[friendly] then
				table.removeValue(pureCenterBacksArray, friendly)
				table.removeValue(unassigned, friendly)
				if table.count(pureCenterBacks) < 2 then
					defaultCenterBack = pureCenterBacksArray[1]
					table.removeValue(unassigned, defaultCenterBack)
				end
			end
		end
	end

	if #unassigned > 0 then -- should only happen when there were too few to mark
		if #pureCenterBacksArray > 0 then
			defaultCenterBack = table.remove(pureCenterBacksArray, 1)
		else
			table.sort(unassigned, distToFriendlyGoal)
			defaultCenterBack = table.remove(unassigned, 1)
		end
	end
	if needCountersideCB and not countersideCenterBack then
		countersideCenterBack = table.remove(unassigned, 1)
	end

	for opp, manMarker in pairs(markedOpps) do
		self._send.roleAssignment(manMarker, { name = "ManMark", params = opp})
	end
	if defaultCenterBack then
		debug.set("default CenterBack", defaultCenterBack)
		self._send.roleAssignment(defaultCenterBack, { name = "CenterBack", params = World.Ball })
	end
	if countersideCenterBack then
		debug.set("counterside CenterBack", countersideCenterBack)
		local countersideTarget = World.Ball.pos.x > 0 and countersideTargetLeft or countersideTargetRight
		self._send.roleAssignment(countersideCenterBack, { name = "CenterBack", params = countersideTarget })
	end
end

return Defense
