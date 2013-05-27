local ReceivePass = (require "../base/class").new("Task.ReceivePass", require "task/base")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Observer = require "observer/ball"
local geom = require "../base/geom"
local Rating = require "util/rating"
local vis = require "../base/vis"
local Goal = require "observer/goal"
local Interval = require "util/interval"
local debug = require "../base/debug"

ReceivePass.priority = 5

function ReceivePass:_init()
end

local function getBestSector(viewPos, robotList, goalStartAngle, goalEndAngle) -- fills the list of occupied sectors
	local occupiedSectors = {}
	local extraRadius = World.Ball.radius
	
	--transform
	local transformAngle = (goalStartAngle+goalEndAngle)/2-math.pi -- too ensure working gap betwen start and end angle max 180°
	local goalStartAngle = goalStartAngle - transformAngle
	local goalEndAngle = goalEndAngle - transformAngle
	
	for _, robot in pairs(robotList) do --TODO not all robots are relevant
		local toRobot = robot.pos - viewPos -- vector from viewPos to center of robot
		local robotAngleDiff
		if robot.radius + extraRadius <= toRobot:length() then
			robotAngleDiff = math.asin((robot.radius + extraRadius) / toRobot:length()) -- min angle between toRobot and shoot sector
		else
			robotAngleDiff = math.pi/2 -- 90 deg, if the ball touches the robot (asin[-1,1]!)
		end
		
		--transform
		local robotAngle = (toRobot:angle()-transformAngle)%(2*math.pi) -- direction of the robot
		local robotStart = math.bound(goalStartAngle, robotAngle - robotAngleDiff, goalEndAngle)
		local robotEnd = math.bound(goalStartAngle, robotAngle + robotAngleDiff, goalEndAngle)
		if robotStart < goalEndAngle or robotEnd > goalStartAngle then -- if the robot covers a part of the goal --FIXME: ?could be that everything is occupied?
			table.insert(occupiedSectors, {math.max(robotStart, goalStartAngle), math.min(robotEnd, goalEndAngle)}) -- add the occupied sector to the list
		end
	end

	table.sort(occupiedSectors, function (t1, t2) return t1[1] < t2[1] end) -- sort sectors ascending by sectorStart
	Interval.merge(occupiedSectors) -- merge the sectors
	local unoccupiedSectors = Interval.negate(occupiedSectors, goalStartAngle, goalEndAngle)

	local indexLargest = nil -- index of largest sector
	local valueLargest = 0 -- angle difference of the largest sector
	for i = 1, #unoccupiedSectors do -- find the largest sector
		local diff = unoccupiedSectors[i][2] - unoccupiedSectors[i][1]
		if diff > valueLargest then
			indexLargest = i
			valueLargest = diff
		end
	end
	unoccupiedSectors[indexLargest][1] = (unoccupiedSectors[indexLargest][1]+transformAngle)%(2*math.pi)
	unoccupiedSectors[indexLargest][2] = (unoccupiedSectors[indexLargest][2]+transformAngle)%(2*math.pi)
	if unoccupiedSectors[indexLargest][1] > unoccupiedSectors[indexLargest][2] then
		unoccupiedSectors[indexLargest][1] = unoccupiedSectors[indexLargest][1] - (2*math.pi)
	end
	return unoccupiedSectors[indexLargest], valueLargest -- returns the largest sector and its angle difference
end

function ReceivePass:_run(priorityMessages, notifications)
	if isShot then
		vis.addCircle("RecivePassMoveTo", self.moveTo, 0.03, blue, true)
		
		self._robot.path:setDefaultObstacles(self._robot, true)
		self._robot.path:addRobotObstacles(self._robot)
	else --play free
		local vectorToBall = (World.Ball.pos-self._robot.pos)
		local distanceToBall = vectorToBall:length()
		local bestSector, width = getBestSector(World.Ball.pos, World.OpponentRobots, self.shotDir:angle()-(math.pi/4), self.shotDir:angle()+(math.pi/4))
		local anglePos = Vector.fromAngle(bestSector[1]+(width/2))
		local anglePos = anglePos:copy():setLength(distanceToBall)
		self.moveTo = anglePos + World.Ball.pos
	end
	
	local faceBall = (World.Ball.pos-self.moveTo):angle()
	self._robot.path:setDefaultObstacles(self._robot, false, false)
	self._robot.trajectory:update(ToTarget, self.moveTo, faceBall)
end

function ReceivePass.factory(position)
	local f = function (robots)
		return ReceivePass.create(robots[position])
	end
	return f
end

function ReceivePass.test(id)
	if id > 0 then
		return nil
	end
	return ReceivePass.factory(1), 1
end

function ReceivePass:_rate()
	self.shotPos, self.shotDir, self.isShot = Goal.predictShot()
	if isShot then --catch ball
		local ballSpeed = World.Ball.speed:length()
		-- bei schnellen Baellen in den Weg stellen und abfangen
		if ballSpeed > Settings.slowBall then
			self.moveTo = self._robot.pos:nearestPosOnLine(World.Ball.pos, World.Ball.pos+(World.Ball.speed * 30))
		--bei langsamen Baellen entgegenbewegen
		else
			self.moveTo = World.Ball.pos - (World.Ball.pos - self._robot.pos):setLength(self._robot.shootRadius)
		end
		return Rating.posToRating(self._robot, self.moveTo)
	else --higher rating in robots is more free + in the enemy playing field half
		local robotsInWay = 0
		self.shotDir = self.shotDir:copy():setLength(30)
		for _, robot in ipairs(World.OpponentRobots) do
			if (robot.pos:distanceToLineSegment(self.shotPos, self.shotPos + self.shotDir) < 0.5) then
				robotsInWay = robotsInWay + 1
			end
		end
		return 1/robotsInWay * math.bound(0, ((self._robot.pos.y+World.Geometry.FieldHeightHalf)/(2.2*World.Geometry.FieldHeightQuarter)), 1)
	end
end

return ReceivePass
