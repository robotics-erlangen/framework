local Goal = {}

local World = require "../base/world"
local Field = require "../base/field"
local G = World.Geometry
local Interval = require "util/interval"
local Ball = require "observer/ball"
local geom = require "../base/geom"
local vis = require "../base/vis"
local Constants = require "../base/constants"
local Cache = require "../base/cache"
local Volley = require "task/ability/volley"

--- returns a list of all non-free sectors
-- the non-free sectors are not merged and not sorted
-- the interval has to be oriented counter-clockwise
-- @param viewPos vector - usually Ball.pos
-- @param robotList list - all robots that may block the sight
-- @param startAngle number - start angle of the sector to scan
-- @param endAngle number - end angle of the sector to scan
-- @return occupiedSectors list - all unsorted, unmerged occupied sectors
function Goal.getOccupiedSectors(viewPos, robotList, startAngle, endAngle)
	if endAngle < startAngle then -- normalize angles
		endAngle = endAngle + 2 * math.pi
	end

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
		if robotStart < endAngle and robotEnd > startAngle then -- if the robot covers a part of the goal
			table.insert(occupiedSectors, {math.max(robotStart, startAngle), math.min(robotEnd, endAngle)}) -- add the occupied sector to the list
		end
		if robotStart + 2 * math.pi < endAngle then -- normalize angles
			-- checking for robotEnd + 2*pi > startAngle is not needed, as robotEnd is always >= 0 and startAngle < 2pi
			-- and thus is always true
			robotStart = robotStart + 2 * math.pi
			robotEnd = robotEnd + 2 * math.pi
			table.insert(occupiedSectors, {math.max(robotStart, startAngle), math.min(robotEnd, endAngle)}) -- add the occupied sector to the list
		end
	end
	return occupiedSectors
end

function Goal.getFreeSectors(viewPos, robotList, startAngle, endAngle)
	if endAngle < startAngle then -- normalize angles
		endAngle = endAngle + 2 * math.pi
	end
	local occupiedSectors = Goal.getOccupiedSectors(viewPos, robotList, startAngle, endAngle)
	Interval.sort(occupiedSectors) -- sort sectors ascending by sectorStart
	Interval.merge(occupiedSectors) -- merge the sectors
	return Interval.negate(occupiedSectors, startAngle, endAngle)
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

	local unoccupiedSectors = Goal.getFreeSectors(viewPos, robotList, goalStart, goalEnd)
	--log(tostring(goalEnd - goalStart))
	-- returns all unoccupied sectors in the interval [right goalpost, left goalpost]
	return unoccupiedSectors
end

--- Returns the largest free sector and its width (angle difference)
-- @param viewPos vector - position from which the free angles should be found
-- @param robotList list - all robot objects that should be considered
-- @param opp boolean - true for opponent goal, false for friendly goal
-- @return largestFreeSector interval - the largest free sector
function Goal.largestFreeSector(viewPos, robotList, opp)
	local unoccupiedSectors = Goal.freeSectors(viewPos, robotList, opp) -- get list of all unoccupied sectors
	return Interval.getLargest(unoccupiedSectors)
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
	local s_right, s_left
	local keeper = opp and World.OpponentKeeper or World.FriendlyKeeper
	local r = World.Ball.radius
	local m = r/math.sqrt((G.GoalWidth)^2 - r^2)	-- always the positive slope	y = m*x + t
	if not keeper then	-- no keeper assigned
		rightSector[1] = math.atan2((opp and -m or m), (opp and -1 or 1))
		rightSector[2] = math.atan2((opp and -m or m), (opp and 1 or -1))
		s_right = Vector.create(0, (opp and 1 or -1)*(G.FieldHeightHalf - 0.5*m*G.GoalWidth))
	else
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
		if (keeper.pos.y)*(opp and 1 or -1) > -math.abs(m*keeper.pos.x) + G.FieldHeightHalf - t + d then
			rightSector[1] = math.atan2((opp and -m or m), (opp and -1 or 1))
			rightSector[2] = math.atan2((opp and -m or m), (opp and 1 or -1))
			s_right = Vector.create(0, (opp and 1 or -1)*(G.FieldHeightHalf - 0.5*m*G.GoalWidth))
		else
			local mid = Vector.create(0, (G.FieldHeightHalf - t)*(opp and 1 or -1))
			local gright = opp and G.OpponentGoalRight or G.FriendlyGoalLeft
			local gleft = opp and G.OpponentGoalLeft or G.FriendlyGoalRight
			-- right from the keeper (looking from field towards goal)
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
							local lowerGoalieEnd = Vector.create(keeper.pos.x - r, keeper.pos.y)
							local pfp1, pfp2 = geom.getTangentsToCircle(lowerGoalieEnd, gleft, r)
							if (pfp2.y - pfp1.y)*(opp and 1 or -1) < 0 then
								pfp1, pfp2 = pfp2, pfp1
							end
							s_left = geom.intersectLinesByPoints(pfp1, lowerGoalieEnd, gleft, tp1)
							leftSector[1] = (pfp1 - lowerGoalieEnd):angle()
							leftSector[2] = (tp1 - s_left):angle()
						else
							leftSector[1] = math.atan2(opp and -m or m, opp and -1 or 1)
							leftSector[2] = (tp1 - s_left):angle()
						end
					end
				else
					leftSector[1] = math.atan2(opp and -m or m, opp and -1 or 1)
					if (gleft - tp1):lengthSq() < (gleft - s_left):lengthSq() then
						leftSector[2] = (s_left - tp1):angle()
					else
						leftSector[2] = (tp1 - s_left):angle()
					end
				end
			else
				-- left sector is empty list, because keeper is too close to the left goalpost
			end
			if #leftSector == 2 then
				leftSector = Goal.getFreeSectors(s_left, robotList, leftSector[1], leftSector[2])
			end
		end
	end
	if #rightSector == 2 then
		rightSector = Goal.getFreeSectors(s_right, robotList, rightSector[1], rightSector[2])
	end
	return s_right, rightSector, s_left, leftSector
	-- TODO: robotlist beachten, auch in den Fällen, bei denen bis jetzt sofort returnt wird
end

--- Searches for robots near goal
-- @param distance number - the distance to to goal
-- @param robotList list - the robots to be evaluated
-- @param opp boolean - true for opponent goal, false for friendly goal
-- @return near list - list of all robots from robotList that are up to distance from the goal
function Goal.getRobotsNearGoal(distance, robotList, opp)
	local near = {}
	for _, r in pairs(robotList) do
		if r.pos:distanceToLineSegment(opp and G.OpponentGoalRight or G.FriendlyGoalRight, opp and G.OpponentGoalLeft or G.FriendlyGoalLeft) <= distance then
			table.insert(near, r)
		end
	end
	return near
end

--- Predicts the direction the ball will be shot into.
-- Checks for ball movement, opponents near the ball, tries to predict passes
-- @return pos Vector - origin of movement
-- @return dir Vector - ball movement direction and speed
-- @return isShot bool - if the ball is fast (and should be considered as a threat)
-- @return passRecievers list - list of all robots that could recieve the pass
function Goal.predictShot()
	local dir = World.Ball.speed:copy() -- Defend ball by default
	local pos = World.Ball.pos
	local isShot = false
	local passRecievers = {}

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
		if (intersectGoal and math.abs(intersectGoal.x) > World.Geometry.FieldWidthHalf) or dir.y > 0 then	-- if the ball moves away from our goal
			local endOfField = Field.nextLineCut(pos, dir)
			local lengthOfBallMovement = 0.5*dir:lengthSq()/(-Constants.ballDeceleration)
			if (endOfField - pos):lengthSq() > lengthOfBallMovement*lengthOfBallMovement then
				endOfField = pos + dir:scaleLength(lengthOfBallMovement)
			end
			vis.addCircle("o/goal: predictShot: end of field", endOfField, 0.02)
			local target = nil
			local targetDist = math.huge
			local corridorHalf = dir:perpendicular():setLength(World.Ball.radius + Constants.positionError)
			for _, robot in pairs(World.OpponentRobots) do
				local pointOnLine = robot.pos:nearestPosOnLine(pos, endOfField)
				local ballRollTime = Ball.ballRollTime(dir:length(), (pointOnLine - pos):length())
				local chance = Ball.ballCatchProbability(robot, 0, ballRollTime, pointOnLine, corridorHalf)
				if chance > 0 then
					local index = 1
					local range = false
					for k, p in pairs(passRecievers) do	-- find the position in the table, so that the table is still sorted (after ascending chance) after insertion
						index = k
						if p[2] > chance then
							range = true
							break
						end
					end
					if range then
						table.insert(passRecievers, index, {robot, chance})
					else
						table.insert(passRecievers, {robot, chance})
					end
					vis.addCircle("o/goal: predictShot: may recieve pass", robot.pos, robot.radius, vis.fromRGBA(255, 63, 0, 255*chance), true)
					vis.addPath("o/goal: predictShot: to catch position", {robot.pos, pointOnLine})
				end
			end
			local nPassRecievers = #passRecievers
			if nPassRecievers > 0 then -- if there is a pass reciever, just block it
				local passReciever = passRecievers[nPassRecievers]
				pos = passReciever[1].pos + Vector.fromAngle(passReciever[1].dir) * (passReciever[1].shootRadius + World.Ball.radius)
				local ballRollTime = Ball.ballRollTime(World.Ball.speed:length(), World.Ball.pos:distanceTo(pos))
				local ballSpeed = Ball.atTime(ballRollTime, World.Ball).speed:length()
				local ballAngle = (-World.Ball.speed):angle()
				local robotAngle = passReciever[1].dir
				local dirx, diry = Volley.calcVOut(8, ballSpeed, robotAngle, ballAngle)
				dir = Vector.create(dirx, diry):normalize()
				vis.addCircle("o/goal: predictShot: receives pass", pos, passReciever[1].radius, vis.colors.pink, false)
				vis.addPath("o/goal: predictShot: receives pass", {pos, pos + dir * 10}, vis.colors.pink)
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

	return pos, dir, isShot, passRecievers
end
Goal.predictShot = Cache.forFrame(Goal.predictShot)


return Goal
