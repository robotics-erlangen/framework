local Goal = {}

local World = require "../base/world"
local G = World.Geometry
local Interval = require "util/interval"
local Ball = require "observer/ball"
local geom = require "../base/geom"
local vis = require "../base/vis"

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
	--log(tostring(m))
	if not keeper then	-- no keeper assigned
		rightSector[1] = math.atan2((opp and -m or m), (opp and -1 or 1))
		rightSector[2] = math.atan2((opp and -m or m), (opp and 1 or -1))
		local s_right = Vector.create(0, (opp and 1 or -1)*(G.FieldHeightHalf - 0.5*m*G.GoalWidth))
		return s_right, rightSector, nil, leftSector
	end
	--log(tostring(keeper.pos))
	local R = keeper.radius + r
	local t = math.sqrt(r^2 * (1 + m^2))
	local d = math.sqrt(R^2 * (1 + m^2))
	local th = (G.GoalWidth/2 - (R + r)/math.sqrt(1 + m^2))
	--[[
	local midp = Vector.create(0, G.FieldHeightHalf-t+d)
	local leftp = midp + Vector.fromAngle(math.atan2(-m, -1))*4
	local rightp = midp + Vector.fromAngle(math.atan2(-m, 1))*4
	vis.addPath("triangle", {leftp, midp, rightp}, vis.black)
	]]--
	if (keeper.pos.y)*(opp and 1 or -1) > -math.abs(m*keeper.pos.x) + G.FieldHeightHalf -t+d then
		rightSector[1] = math.atan2((opp and -m or m), (opp and -1 or 1))
		rightSector[2] = math.atan2((opp and -m or m), (opp and 1 or -1))
		local s_right = Vector.create(0, (opp and 1 or -1)*(G.FieldHeightHalf - 0.5*m*G.GoalWidth))
		return s_right, rightSector, nil, leftSector
	end
	local mid = Vector.create(0, (G.FieldHeightHalf - t)*(opp and 1 or -1))
	local gright = opp and G.OpponentGoalRight or G.FriendlyGoalLeft
	local gleft = opp and G.OpponentGoalLeft or G.FriendlyGoalRight
	-- right from the keeper (looking from field towards goal)
	local s_right
	if keeper.pos:distanceTo(gright) > R + r then
		local tp1, tp2 = geom.getTangentsToCircle(gright, keeper.pos, R) -- tangents from the goalpost onto the keeper
		if geom.checkTriangleOrientation(gright, keeper.pos, tp1) == 1 then
			-- tp1 = tp1
		elseif geom.checkTriangleOrientation(gright, keeper.pos, tp2) == 1 then
			tp1, tp2 = tp2, tp1
		else
			if math.abs(tp1.y) > math.abs(tp2.y) then
				tp1, tp2 = tp2, tp1
			end
		end
		--vis.addCircle("c", tp1, 0.1)
		s_right = geom.intersectLinesByPoints(gleft, mid, gright, tp1)
		if keeper.pos.y*(opp and 1 or -1) > G.FieldHeightHalf + (opp and -m or m)*keeper.pos.x - d - t then -- wenn der Torwart hinter der vorderen gewinkelten Linie ist
			if keeper.pos.x * (opp and 1 or -1) > th then -- Wenn der Torwart seitlich vom Tor steht
				--log("Right: nothing")
				
			else
				local posy = keeper.pos.y * (opp and 1 or -1)
				if math.abs(keeper.pos.x) < th and posy > G.FieldHeightHalf - m*keeper.pos.x - t and posy < G.FieldHeightHalf + G.GoalDepth then -- if keeper is in goal
					local upperGoalieEnd = Vector.create(keeper.pos.x + r, keeper.pos.y)
					local pfp1, pfp2 = geom.getTangentsToCircle(upperGoalieEnd, gright, r)
					if (pfp2.y - pfp1.y)*(opp and 1 or -1) < 0 then
						pfp1, pfp2 = pfp2, pfp1
					end
					s_right = geom.intersectLinesByPoints(pfp1, upperGoalieEnd, gright, tp1)
					rightSector[2] = (pfp1 - upperGoalieEnd):angle()
					rightSector[1] = (tp1 - s_right):angle()
				else
					rightSector[2] = math.atan2(opp and -m or m, opp and 1 or -1)
					rightSector[1] = (tp1 - s_right):angle()
				end
			end
		else
			--log(opp and "" or "hier")
			rightSector[2] = math.atan2(opp and -m or m, opp and 1 or -1)
			if (gright - tp1):lengthSq() < (gright - s_right):lengthSq() then
				rightSector[1] = (s_right - tp1):angle()
			else
				rightSector[1] = (tp1 - s_right):angle()
			end
		end
	else
		-- right sector is empty list, because keeper is too close to the right goalpost
	end
	-- left from the keeper (looking from field towards goal)
	local s_left
	if keeper.pos:distanceTo(gleft) > R + r then
		local tp1, tp2 = geom.getTangentsToCircle(gleft, keeper.pos, R) -- tangents from the goalpost onto the keeper
		if geom.checkTriangleOrientation(gleft, keeper.pos, tp1) == 1 then
			tp1, tp2 = tp2, tp1
		elseif geom.checkTriangleOrientation(gleft, keeper.pos, tp2) == 1 then
			-- tp1 = tp1
		else
			if math.abs(tp1.y) > math.abs(tp2.y) then
				tp1, tp2 = tp2, tp1
			end
		end
		s_left = geom.intersectLinesByPoints(gright, mid, gleft, tp1)
		if keeper.pos.y*(opp and 1 or -1) > G.FieldHeightHalf + (opp and m or -m)*keeper.pos.x - d - t then -- wenn der Torwart hinter der vorderen gewinkelten Linie ist
			if keeper.pos.x * (opp and -1 or 1) > th then -- Wenn der Torwart seitlich vom Tor steht
				--log("Left: nothing")
			else
				local posy = keeper.pos.y * (opp and 1 or -1)
				if math.abs(keeper.pos.x) < th and posy > G.FieldHeightHalf + m*keeper.pos.x - t and posy < G.FieldHeightHalf + G.GoalDepth then -- if keeper is in goal
					--log("hier!")
					local lowerGoalieEnd = Vector.create(keeper.pos.x - r, keeper.pos.y)
					local pfp1, pfp2 = geom.getTangentsToCircle(lowerGoalieEnd, gleft, r)
					if (pfp2.y - pfp1.y)*(opp and 1 or -1) < 0 then
						pfp1, pfp2 = pfp2, pfp1
					end
					s_left = geom.intersectLinesByPoints(pfp1, lowerGoalieEnd, gleft, tp1)
					leftSector[2] = (pfp1 - lowerGoalieEnd):angle()
					leftSector[1] = (tp1 - s_left):angle()
				else
					leftSector[2] = math.atan2(opp and -m or m, opp and -1 or 1)
					leftSector[1] = (tp1 - s_left):angle()
				end
			end
		else
			leftSector[2] = math.atan2(opp and -m or m, opp and -1 or 1)
			if (gleft - tp1):lengthSq() < (gleft - s_left):lengthSq() then
				leftSector[1] = (s_left - tp1):angle()
			else
				leftSector[1] = (tp1 - s_left):angle()
			end
		end
	else
		-- left sector is empty list, because keeper is too close to the left goalpost
	end
	return s_right, rightSector, s_left, leftSector
	-- TODO: robotlist beachten, vorsicht, wenn keeper.pos.y außerhalb des Felds
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
		dir = Vector.fromAngle(oppBallOwner.dir)
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
