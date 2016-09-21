local Goal = {}

local Cache = require "../base/cache"
local Constants = require "../base/constants"
local Field = require "../base/field"
local geom = require "../base/geom"
local vis = require "../base/vis"
local World = require "../base/world"

local Ball = require "observer/ball"
local Physics = require "observer/physics"
local Volley = require "task/ability/volley"
local Interval = require "util/interval"


local G = World.Geometry

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

--- Returns a list of all sectors not covered by any robot from robotList (not limited to the goal)
-- @param viewPos vector - position from which the free angles should be found
-- @param robotList list - all robot objects that should be considered
function Goal.allFreeSectors(viewPos, robotList)
	local occupiedSectors = Goal.getOccupiedSectors(viewPos, robotList, 0, 2*math.pi)
	--for i,sector in ipairs(occupiedSectors) do
	--	debug.set("osectors["..i.."]", "{"..sector[1]..", "..sector[2].."}")
	--end
	local matching = nil
	local delete = {}
	for i,sector in ipairs(occupiedSectors) do
		if sector[1] == 0 then
			if matching then
				occupiedSectors[matching] = {occupiedSectors[matching][1], sector[2] + 2*math.pi}
				--debug.set("match "..matching.." & "..i, "{"..occupiedSectors[matching][1]..", "..occupiedSectors[matching][2].."}")
				matching = nil
				table.insert(delete, i)
			else
				matching = i
				--debug.set("match "..i, "start")
				--log("start")
			end
		elseif sector[2] == 2*math.pi then
			if matching then
				occupiedSectors[matching] = {sector[1], occupiedSectors[matching][2] + 2*math.pi}
				--debug.set("match "..matching.." & "..i, "{"..occupiedSectors[matching][1]..", "..occupiedSectors[matching][2].."}")
				matching = nil
				table.insert(delete, i)
			else
				matching = i
				--debug.set("match "..i, "end")
				--log("end")
			end
		end
	end
	for i = #delete,1,-1 do
		table.remove(occupiedSectors, delete[i])
	end
	Interval.sort(occupiedSectors)
	--for i,sector in ipairs(occupiedSectors) do
	--	debug.set("O2sectors["..i.."]", "{"..sector[1]..", "..sector[2].."}")
	--end
	Interval.merge(occupiedSectors)
	--for i,sector in ipairs(occupiedSectors) do
	--	debug.set("MOsectors["..i.."]", "{"..sector[1]..", "..sector[2].."}")
	--end
	local freeSectors = Interval.negate(occupiedSectors, -42, 1337) -- magic constants, don't change!
	if #freeSectors > 2 then
		local first = freeSectors[1]
		local last = freeSectors[#freeSectors]
		--log(#freeSectors)
		--for i,sector in ipairs(freeSectors) do
		--	debug.set("Fsectors["..i.."]", "{"..sector[1]..", "..sector[2].."}")
		--end
		freeSectors[1] = {last[1], first[2]}
		table.remove(freeSectors)
	elseif #freeSectors > 1 then -- exactly 2 halfs (that are actually 1 sector, but with a sign flip)
		local first = freeSectors[1]
		local second = freeSectors[2]
		freeSectors = {{second[1], first[2]}}
		--for i,sector in ipairs(freeSectors) do
		--	debug.set("Fsectors["..i.."]", "{"..sector[1]..", "..sector[2].."}")
		--end
	else -- no free sector
		freeSectors = {}
	end
	-- remove sectors that are broader than 2pi
	for i = #freeSectors,1,-1 do
		if math.abs(freeSectors[i][2] - freeSectors[i][1]) > 2*math.pi then
			table.remove(freeSectors, i)
		end
	end
	return freeSectors
end

--- Predicts the direction the ball will be shot into.
-- Checks for ball movement, opponents near the ball, tries to predict passes
-- @return pos Vector - origin of movement
-- @return dir Vector - ball movement direction and speed
-- @return isShot bool - if the ball is fast (and should be considered as a threat)
-- @return passReceivers list - list of all robots that could receive the pass
local SLOW_BALL = 0.7
function Goal.predictShot()
	local ballSpeed = World.Ball.speed:copy() -- Defend ball by default
	local pos = World.Ball.pos
	local isShot = false
	local passReceivers = {}

	local oppBallOwner = Ball.opponentBallOwner()
	if oppBallOwner and ballSpeed:length() <= SLOW_BALL then
		-- if opponent is close to ball use its orientation
		ballSpeed = Vector.fromAngle(oppBallOwner.dir)
	elseif ballSpeed:length() > SLOW_BALL then
		local intersectGoal = geom.intersectLineLine(pos, ballSpeed, World.Geometry.FriendlyGoal, Vector(1, 0))
		-- FIXME as the ball is moving also use pass check if it slightly misses the goal
		-- TODO check whether an opponent robot may deflect the ball inside the keeper area?
		-- check if there's a robot which may recieve the pass
		if (intersectGoal and math.abs(intersectGoal.x) > World.Geometry.FieldWidthHalf) or ballSpeed.y > 0 then -- if the ball moves away from our goal
			local endOfField = Field.nextLineCut(pos, ballSpeed)
			local lengthOfBallMovement = 0.5*ballSpeed:lengthSq()/(-Constants.ballDeceleration)
			if (endOfField - pos):lengthSq() > lengthOfBallMovement*lengthOfBallMovement then
				endOfField = pos + ballSpeed:scaleLength(lengthOfBallMovement)
			end
			vis.addCircle("o/goal: predictShot: end of field", endOfField, 0.02)
			local target = nil
			local targetDist = math.huge
			local corridorHalf = ballSpeed:perpendicular():setLength(World.Ball.radius + Constants.positionError) * 2
			for _, robot in ipairs(World.OpponentRobots) do
				local pointOnLine = robot.pos:nearestPosOnLine(pos, endOfField)
				local ballRollTime = Physics.ballRollTime(World.Ball, (pointOnLine - pos):length())
				local chance = Ball.ballCatchProbability(robot, 0, ballRollTime, pointOnLine, corridorHalf)
				if chance > 0 then
					local index = 1
					local range = false
					for k, p in ipairs(passReceivers) do -- find the position in the table, so that the table is still sorted (after ascending chance) after insertion
						index = k
						if p[2] > chance then
							range = true
							break
						end
					end
					if range then
						table.insert(passReceivers, index, {robot, chance})
					else
						table.insert(passReceivers, {robot, chance})
					end
					vis.addCircle("o/goal: predictShot: may recieve pass", robot.pos, robot.radius, vis.fromRGBA(255, 63, 0, 255*chance), true)
					vis.addPath("o/goal: predictShot: to catch position", {robot.pos, pointOnLine})
				end
			end
			local nPassReceivers = #passReceivers
			if nPassReceivers > 0 then -- if there is a pass receiver, just block it
				local passReciever = passReceivers[nPassReceivers]
				pos = passReciever[1].pos + Vector.fromAngle(passReciever[1].dir) * (passReciever[1].shootRadius + World.Ball.radius)
				local ballRollTime = Physics.ballRollTime(World.Ball, World.Ball.pos:distanceTo(pos))
				local ballSpeedLength = Physics.ballAtTime(World.Ball, ballRollTime).speed:length()
				local ballAngle = World.Ball.speed:angle()
				local robotAngle = passReciever[1].dir
				local dirx, diry = Volley.calcVOut(8, ballSpeedLength, robotAngle, ballAngle)
				ballSpeed = Vector(dirx, diry):normalize()
				vis.addCircle("o/goal: predictShot: receives pass", pos, passReciever[1].radius, vis.colors.pink, false)
				vis.addPath("o/goal: predictShot: receives pass", {pos, pos + ballSpeed * 10}, vis.colors.pink)
			end
		end
		isShot = true
	else
		-- otherwise use center of directions to goal posts
		-- FIXME: check
		local left = (World.Geometry.FriendlyGoalLeft - World.Ball.pos):normalize()
		local right = (World.Geometry.FriendlyGoalRight - World.Ball.pos):normalize()
		ballSpeed = left + right
	end

	return pos, ballSpeed, isShot, passReceivers
end
Goal.predictShot = Cache.forFrame(Goal.predictShot)


return Goal
