local DefendPenalty = Class("Task.DefendPenalty", require "task/base")

local geom = require "../base/geom"
local vis = require "../base/vis"
local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local Interval = require "util/interval"


local PENALTY_LINE_DISTANCE = 0.35 -- prevent robots from crossing the penalty line

local obstacleTable = {
	ignoreBall = false,
	ignorePass = true
}


function DefendPenalty:run()
	local rr = self._robot.radius --assume all robots have the same radius
	local penaltyLine = World.Geometry.OwnPenaltyLine + PENALTY_LINE_DISTANCE
	vis.addPath("t/defendpenalty: penaltyDistance", {Vector(-2,penaltyLine), Vector(2,penaltyLine)}, vis.colors.whiteHalf)
	-- NOTE: All spots are on the penaltyline, so only x-values are processed

	local occupiedSpotsFriendly = {}
	for robot, pos in pairs(self._inbox.moveDest()) do
		if math.abs(pos.y - penaltyLine) < 2*rr and robot.id > self._robot.id then
			table.insert(occupiedSpotsFriendly, pos.x)
		end
	end

	local occupiedSpotsOpp = {} -- positions of opponents on the line
	for _, robot in ipairs(World.OpponentRobots) do
		if math.abs(robot.pos.y - penaltyLine) < rr then
			table.insert(occupiedSpotsOpp, robot.pos.x)
		end
	end
	local preferredSpots = {}
	for _, robot in ipairs(World.OpponentRobots) do
		if robot ~= World.OpponentKeeper and (robot.pos.y+rr) > penaltyLine then
			-- prefer spot between own keeper and opponent to catch rebound
			local ownKeeperPos = World.FriendlyKeeper and World.FriendlyKeeper.pos or World.Geometry.FriendlyGoal
			local keeperOppDir = robot.pos - ownKeeperPos
			local prefSpot = (geom.intersectLineLine(ownKeeperPos, keeperOppDir, Vector(0, penaltyLine), Vector.fromAngle(math.pi)))
			if prefSpot then
				table.insert(preferredSpots, prefSpot.x)
			end
		end
	end

	local targetPos
	-- preference one: next to an opponent on the penaltyLine
	table.sort(occupiedSpotsOpp)
	for i = 1, #occupiedSpotsOpp do
		-- ignore if other defender is there
		local alreadyMarked = false
		for _, defX in ipairs(occupiedSpotsFriendly) do
			if math.abs(occupiedSpotsOpp[i] - defX) < 2.5* rr then
				alreadyMarked = true
			end
		end
		if not alreadyMarked then
			-- check dist to next occupied spot
			local left = occupiedSpotsOpp[i-1] and math.abs(occupiedSpotsOpp[i-1] - occupiedSpotsOpp[i]) < 2.5* rr
			local right = occupiedSpotsOpp[i+1] and math.abs(occupiedSpotsOpp[i+1] - occupiedSpotsOpp[i]) < 2.5* rr
			local leftPos = occupiedSpotsOpp[i] - 2*rr
			local rightPos = occupiedSpotsOpp[i] + 2*rr
			-- prefer side to the middle
			if occupiedSpotsOpp[i] > 0 then -- opponent is on the right side
				if not left then
					targetPos = leftPos
					break
				elseif not right then
					targetPos = rightPos
					break
				end
			else -- opponent is on the left side
				if not right then
					targetPos = rightPos
					break
				elseif not left then
					targetPos = leftPos
					break
				end
			end
		end
	end

	local occupiedSpotsAll = table.combine(occupiedSpotsOpp, occupiedSpotsFriendly)
	if not targetPos then -- preference two: intersection of penaltyLine and line from opponent to friendlyKeeper
		for _, prefX in ipairs(preferredSpots) do
			local noOneNear = true
			for _, occX in ipairs(occupiedSpotsAll) do
				if math.abs(prefX - occX) < 2*rr then
					noOneNear = false
					break
				end
			end
			if noOneNear then
				targetPos = prefX
			end
		end
	end
	if not targetPos then -- fallback: search free point on penaltyLine, which is closest to the middle
		local occupiedSectors = table.map(occupiedSpotsAll, function(x) return {x-rr,x+rr} end)
		Interval.sort(occupiedSectors)
		Interval.merge(occupiedSectors)
		local widthLimit = World.Geometry.FieldWidthHalf - 2 * self._robot.radius
		local freeSectors = Interval.negate(occupiedSectors, -widthLimit, widthLimit)
		targetPos = Interval.getClosestPoint(freeSectors, 0, rr)
	end

	if not targetPos then --should only occur when all the whole penalty line is full with robots (i.e never)
		targetPos = Vector(0, 0)
	else
		targetPos = Vector(targetPos, penaltyLine)
	end

	PathHelper.setDefaultObstacles(self._robot.path, self._robot, obstacleTable)
	self._robot.trajectory:update(ToTarget, targetPos, (World.Ball.pos - self._robot.pos):angle())

	self._send.moveDest("all", targetPos)
end

return DefendPenalty
