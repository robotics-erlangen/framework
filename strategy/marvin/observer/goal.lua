local Goal = {}

local World = require "../base/world"
local G = World.Geometry
local Interval = require "util/interval"
local Ball = require "observer/ball"
local geom = require "../base/geom"

--- returns a list of all non-free sectors
-- but OBACHT! do not use outside of observer/goal.lua
-- the non-free sectors are not merged and not sorted
-- @param viewPos vector - usually Ball.pos
-- @param robotList list - all robots that may block the sight
-- @param goalStartAngle number - the angle of the first goalpost, counter-clockwise
-- @param goalEndAngle number - the angle of the second goalpost, counter-clockwise
-- @return occupiedSectors list - all unsorted, unmerged occupied sectors
local function getOccupiedSectors(viewPos, robotList, goalStartAngle, goalEndAngle) -- fills the list of occupied sectors
	local occupiedSectors = {}
	local extraRadius = World.Ball.radius
	for _, robot in pairs(robotList) do
		local toRobot = robot.pos - viewPos -- vector from viewPos to center of robot
		local robotAngleDiff
		if robot.radius + extraRadius <= toRobot:length() then
			robotAngleDiff = math.asin((robot.radius + extraRadius) / toRobot:length()) -- min angle between toRobot and shoot sector
		else
			robotAngleDiff = math.pi/2 -- 90 deg, if the ball touches the robot (asin[-1,1]!)
		end
		local robotAngle = toRobot:angle() -- direction of the robot
		local robotStart = robotAngle - robotAngleDiff -- can be < 0
		local robotEnd = robotAngle + robotAngleDiff -- can be > 2pi
		if robotStart < goalEndAngle and robotEnd > goalStartAngle then -- if the robot covers a part of the goal
			table.insert(occupiedSectors, {math.max(robotStart, goalStartAngle), math.min(robotEnd, goalEndAngle)}) -- add the occupied sector to the list
		end
	end
	return occupiedSectors
end

--- Returns a list of all free sectors
-- @param viewPos vector - position from which the free angles should be found
-- @param robotList list - all robot objects that should be considered
-- @param opp boolean - true for opponent goal, false for friendly goal
-- @return list - list of free sectors [startAngle, endAngle] ascending by start angle
function Goal.freeSectors(viewPos, robotList, opp)
	if (opp and 1 or -1)*viewPos.y > G.FieldHeightHalf then
		--log("viewPos is behind the goal.")
		return {}
	end

	local goalStart = ((opp and G.OpponentGoalRight or G.FriendlyGoalLeft) - viewPos):angle() -- direction of the first goalpost
	local goalEnd = ((opp and G.OpponentGoalLeft or G.FriendlyGoalRight) - viewPos):angle() -- direction of the other goalpost (is always greater than goalStart, if viewPos is in the field)
	
	local occupiedSectors = getOccupiedSectors(viewPos, robotList, goalStart, goalEnd)
	table.sort(occupiedSectors, function (t1, t2) return t1[1] < t2[1] end) -- sort sectors ascending by sectorStart
	Interval.merge(occupiedSectors) -- merge the sectors

	local unoccupiedSectors = Interval.negate(occupiedSectors, goalStart, goalEnd)
	--log(tostring(goalEnd - goalStart))
	-- returns all unoccupied sectors in the interval [right goalpost, left goalpost]
	return unoccupiedSectors
end

--- Returns the largest free sector and its width (angle difference)
-- @param viewPos vector - position from which the free angles should be found
-- @param robotList list - all robot objects that should be considered
-- @param opp boolean - true for opponent goal, false for friendly goal
-- @return largestFreeSector list, sectorWidth number - the largest free sector and its angle difference
function Goal.largestFreeSector(viewPos, robotList, opp)
	local unoccupiedSectors = Goal.freeSectors(viewPos, robotList, opp) -- get list of all unoccupied sectors
	local indexLargest = nil -- index of largest sector
	local valueLargest = 0 -- angle difference of the largest sector
	for i = 1, #unoccupiedSectors do -- find the largest sector
		local diff = sector[i][2] - sector[i][1]
		if diff > valueLargest then
			indexLargest = i
			valueLargest = diff
		end
	end
	return unoccupiedSectors[indexLargest], valueLargest -- returns the largest sector and its angle difference
end

--- Returns sectors, from where there could be scored
-- @param robotList list - all robots that should be considered; should be only the robots that are closer to the goal than the desired position (not implemented yet)
-- @param opp boolean - true for opponent goal, false for friendly goal
-- @return s_right Vector - the viewpoint for the sectors on the right side
-- @return rightSector list - the sector on the right side of the keeper
-- @return s_left Vector - the viewpoint for the sector on the left side
-- @return leftSector list - the sector on the left side of the keeper
function Goal.searchFreeSectors(robotList, opp)
	local rightSector = {}
	local leftSector = {}
	local keeper = opp and World.OpponentKeeper or World.FriendlyKeeper
	local r = World.Ball.radius
	local m = r/math.sqrt((G.GoalWidth)^2 - r^2)	-- always the positive slope	y = m*x + t
	local t = (G.FieldHeightHalf - math.sqrt((keeper.radius + r)^2 * (1 + m^2))) * (opp and 1 or -1)
	local th = (G.GoalWidth/2 - (keeper.radius + 2*r)/math.sqrt(1 + m^2))
	-- right from the keeper (looking from field towards goal)
	local s_right, p1_right, p2_right = geom.getInnerTangentsToCircles(keeper.pos, keeper.radius + r, opp and G.OpponentGoalRight or G.FriendlyGoalLeft, r)	-- p1.x > p2.x
	if math.abs(keeper.pos.y) < (-m) * keeper.pos.x + t then	-- keeper is far enough out of goal, so that one side of the sector is given by the goalposts
		s_right = geom.intersectLineLine(s_right, (opp and p1_right or p2_right) - s_right, opp and G.OpponentGoalLeft or G.FriendlyGoalRight, Vector.fromAngle(opp and -m or m))
		rightSector[2] = math.atan2((opp and -m or m), (opp and 1 or -1))
		rightSector[1] = ((opp and p1_right or p2_right) - s_right):angle()
	else
		if keeper.pos.x * (opp and 1 or -1) > th then
			-- right sector is empty list, because keeper is so far right, that the ball can't pass between him and the right goalpost
		else
			rightSector[1] = (s_right - (opp and p1_right or p2_right)):angle()
			rightSector[2] = ((opp and p2_right or p1_right) - s_right):angle()
		end
	end
	-- left from the keeper (looking from field towards goal)
	local s_left, p1_left, p2_left = geom.getInnerTangentsToCircles(keeper.pos, keeper.radius + r, opp and G.OpponentGoalLeft or G.FriendlyGoalRight, r)	-- p1.x > p2.x
	if math.abs(keeper.pos.y) < m * keeper.pos.x + t then
		s_left = geom.intersectLineLine(s_left, (opp and p2_left or p1_left) - s_left, opp and G.OpponentGoalRight or G.FriendlyGoalLeft, Vector.fromAngle(opp and m or -m))
		leftSector[1] = math.atan2((opp and -m or m), (opp and -1 or 1))
		leftSector[2] = ((opp and p2_left or p1_left) - s_left):angle()
	else
		if keeper.pos.x * (opp and -1 or 1) > th then
			-- left sector is empty list, because keeper is so far left, that the ball can't pass between him and the left goalpost
		else
			leftSector[1] = (s_left - (opp and p1_left or p2_left))
			leftSector[2] = ((opp and p2_left or p1_left) - s_left):angle()
		end
	end
	return s_right, rightSector, s_left, leftSector
	-- TODO: robotlist beachten, vorsicht, wenn keeper.pos.y auﬂerhalb des Felds
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

	local friendlyBallOwner = Ball.friendlyBallOwner()
	local oppBallOwner = Ball.opponentBallOwner()
	if oppBallOwner and dir:length() <= Settings.slowBall then
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
	elseif not oppBallOwner or friendlyBallOwner then
		-- otherwise use center of directions to goal posts
		-- FIXME: check
		local left = (World.Geometry.FriendlyGoalLeft - World.Ball.pos):normalize()
		local right = (World.Geometry.FriendlyGoalRight - World.Ball.pos):normalize()
		dir = left + right
	end

	return pos, dir, isShot
end


return Goal
