local Goal = {}

local World = require "../base/world"
local Interval = require "util/interval"
local vis = require "../base/vis"
local Ball = require "observer/ball"

local function getOccupiedSectors(viewPos, robotList, goalStart, goalEnd) -- fills the list of occupied sectors
	local occupiedSectors = {}
	local extraRadius = World.Ball.radius/2
	for _, robot in pairs(robotList) do
		local robotDiff = robot.pos - viewPos -- vector from viewPos to center of robot
		local robotDiffAngle = math.asin((robot.radius + extraRadius) / robotDiff:length()) -- min angle between robotDiff and shoot sector
		local robotAngle = robotDiff:angle() -- direction of the robot
		local robotStart = robotAngle - robotDiffAngle -- can be < 0
		local robotEnd = robotAngle + robotDiffAngle -- can be > 2pi
		if robotStart < goalEnd and robotEnd > goalStart then -- if the robot covers a part of the goal
			table.insert(occupiedSectors, {math.max(robotStart, goalStart), math.min(robotEnd, goalEnd)}) -- add the occupied sector to the list
		end
	end
	return occupiedSectors
end

--- Returns a list of all free sectors
-- @param viewPos vector - position from which the free angles should be found
-- @param robotList list - all robot objects that should be considered
-- @param opp boolean - true for opponent goal, false for friendly goal
function Goal.freeSectors(viewPos, robotList, opp)
	if (opp and 1 or -1)*viewPos.y > World.FieldHeigthHalf then
		log("viewPos is behind the goal.")
		return nil
	end

	local goalStart = ((opp and World.OpponentGoalRight or World.FriendlyGoalLeft) - viewPos):angle() -- direction of the first goalpost
	local goalEnd = ((opp and World.OpponentGoalLeft or World.FriendlyGoalRight) - viewPos):angle() -- direction of the other goalpost (is always greater than goalStart, if viewPos is in the field)
	
	local occupiedSectors = getOccupiedSectors(viewPos, robotList, goalStart, goalEnd)
	table.sort(occupiedSectors, function (t1, t2) return t1[1] < t2[1] end) -- sort sectors ascending by sectorStart
	Interval.merge(occupiedSectors) -- merge the sectors
	local unoccupiedSectors = Interval.negate(occupiedSectors, goalStart, goalEnd)
	if true then ---------------------------------------------------------------------------------------------visualization here! set false for performance improvement
		vis.setColor(vis.fromRGBA(255, 127, 0, 127), true)
		for _, s in ipairs(unoccupiedSectors) do
			local pointRight = viewPos + Vector.fromAngle(s[1])*10
			local pointLeft = viewPos + Vector.fromAngle(s[2])*10
			vis.addPolygon("Free Sectors", {viewPos, pointRight, point})
		end
	end
	-- returns all unoccupied sectors in the interval [right goalpost, left goalpost]
	return unoccupiedSectors
end

--- Returns the biggest free sector and its width (angle difference)
-- @param viewPos vector - position from which the free angles should be found
-- @param robotList list - all robot objects that should be considered
-- @param opp boolean - true for opponent goal, false for friendly goal
function Goal.biggestFreeSector(viewPos, robotList, opp)
	local unoccupiedSectors = Goal.freeSectors(viewPos, robotList, opp) -- get list of all unoccupied sectors
	local indexBiggest = nil -- index of biggest sector
	local valueBiggest = 0 -- angle difference of the biggest sector
	for i = 1, #unoccupiedSectors do -- find the biggest sector
		local diff = sector[i][2] - sector[i][1]
		if diff > valueBiggest then
			indexBiggest = key
			valueBiggest = diff
		end
	end
	return unoccupiedSectors[indexBiggest], valueBiggest -- returns the biggest sector and its angle difference
end


--- Predicts the direction the ball will be shot into.
-- Checks for ball movement, opponents near the ball, tries to predict passes
-- @return Vector - origin of movement
-- @return Vector - ball movement direction and speed
-- @return bool - if the ball is fast (and should be considered as a threat)
function Goal.predictShot()
	local dir = World.Ball.speed -- Defend ball by default
	local pos = World.Ball.pos
	local isShot = false

	local ballOwner = Ball.ballOwner()
	if ballOwner and not ballOwner.isFriendly
			and dir:length() <= Settings.slowBall then
		-- if opponent is close to ball use its orientation
		dir = Vector.fromAngle(ballOwner.dir)
	elseif dir:length() > Settings.slowBall then
		local intersectGoal = geom.intersectLineLine(pos, dir, World.Geometry.FriendlyGoal, Vector.create(1, 0))
		-- FIXME as the ball is moving also use pass check if it slightly misses the goal
		-- TODO check whether an opponent robot may deflect the ball inside the keeper area?
		-- check if there's a robot which may recieve the pass
		if (intersectGoal and math.abs(intersectGoal.x) > World.Geometry.FieldWidthHalf) or dir.y > 0 then
			local target = nil
			local targetDist = math.huge
			for _, robot in pairs(World.OpponentRobots) do
				-- FIXME predict robot movement
				if (robot.pos - pos):absoluteAngleDiff(dir) < 10 / 180 * math.pi then
					local rtargetDist = pos:distanceTo(robot.pos)
					if rtargetDist < targetDist then
						targetDist = rtargetDist
						target = robot
					end
				end
			end
			if target then -- if there is a pass reciever, just block it
				-- FIXME account for ball speed in dir calculation
				dir = Vector.fromAngle(target.dir)
				pos = target.pos
			end
		end
		isShot = true
	elseif not ballOwner or ballOwner.isFriendly then
		-- otherwise use center of directions to goal posts
		-- FIXME: check
		local left = (World.Geometry.FriendlyGoalLeft - World.Ball.pos):normalize()
		local right = (World.Geometry.FriendlyGoalRight - World.Ball.pos):normalize()
		dir = left + right
	end

	return pos, dir, isShot
end


return Goal
