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
local Field = require "util/field"

--Settings
local distanceToFieldBoundry = -0.2 --have to be negative value

ReceivePass.priority = 5

function ReceivePass:_init()
end

local function getBestSector(viewPos, robotList, goalStartAngle, goalEndAngle, distanceToBall, SelfRobot) -- fills the list of occupied sectors
	local occupiedSectors = {}
	local extraRadius = World.Ball.radius
	
	--transform
	local transformAngle = (goalStartAngle+goalEndAngle)/2-math.pi -- too ensure working gap betwen start and end angle max 180°
	local goalStartAngle = goalStartAngle - transformAngle
	local goalEndAngle = goalEndAngle - transformAngle
	
	for _, robot in pairs(robotList) do
		if (((robot.pos - World.Ball.pos):length() <= distanceToBall) and (robot ~= selfRobot)) then
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
			if robotStart < goalEndAngle or robotEnd > goalStartAngle then -- if the robot covers a part of the goal
				table.insert(occupiedSectors, {math.max(robotStart, goalStartAngle), math.min(robotEnd, goalEndAngle)}) -- add the occupied sector to the list
			end
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
	if not indexLargest then
		return
	end
	unoccupiedSectors[indexLargest][1] = (unoccupiedSectors[indexLargest][1]+transformAngle)%(2*math.pi)
	unoccupiedSectors[indexLargest][2] = (unoccupiedSectors[indexLargest][2]+transformAngle)%(2*math.pi)
	if unoccupiedSectors[indexLargest][1] > unoccupiedSectors[indexLargest][2] then
		unoccupiedSectors[indexLargest][1] = unoccupiedSectors[indexLargest][1] - (2*math.pi)
	end
	return unoccupiedSectors[indexLargest] -- returns the largest sector
end

function ReceivePass:_run(priorityMessages, notifications)
	if self.isShot then
		vis.addCircle("RecivePassMoveTo", self.moveTo, 0.03, vis.colors.blue, true)
		
		self._robot.path:setDefaultObstacles(self._robot, true)
		self._robot.path:addRobotObstacles(self._robot)
	else --play free
		local distanceToBall = World.Ball.pos:distanceTo(self._robot.pos)
		local bestSector = getBestSector(World.Ball.pos, World.OpponentRobots, self.shotDir:angle() - (math.pi/4), self.shotDir:angle() + (math.pi/4), distanceToBall, self._robot)
		local sectorMid = bestSector and (bestSector[1]+bestSector[2])/2 or (World.Ball.pos - self._robot.pos):angle()
		repeat
		local anglePos = Vector.fromAngle(sectorMid):setLength(distanceToBall)
		vis.addPath("RecivePassSector", {World.Ball.pos, World.Ball.pos + anglePos},vis.colors.red, true)
		self.moveTo = anglePos + World.Ball.pos
		distanceToBall = (distanceToBall - 0.1)
		until(not (Field.isInOpponentDefenseArea(self.moveTo, self._robot.radius)) and Field.isInField(self.moveTo, distanceToFieldBoundry))
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
	self.shotPos, self.shotDir, self.isShot = Goal.predictShot() --?TODO? code zweckentfremdung entfernen
	self.ballOwner = Observer.friendlyBallOwner()
	if (self.ballOwner) then
		self.shotPos = self.ballOwner.pos
		self.shotDir = (World.Ball.pos - self.ballOwner.pos)
	else
		self.shotPos = World.Ball.pos
		self.shotDir = (self._robot.pos - World.Ball.pos)
	end
	
	if self.isShot then --catch ball
		local ballSpeed = World.Ball.speed:length()
		-- bei schnellen Baellen in den Weg stellen und abfangen
		if ballSpeed > Settings.slowBall then --?TODO? slow ball Verhalten entfernen?
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
