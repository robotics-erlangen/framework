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

ReceivePass.priority = 5

function ReceivePass:_init()
	self.isShot = nil
	self.moveTo = nil
end

function ReceivePass:_rate(priorityMessages, notifications)
	local shootPos = nil
	for robot, msg in pairs(notifications) do
		local target = msg.task.passTarget
		if target == self._robot then
			shootPos = msg.task.shootPos
			break
		end
	end

	self.isShot = World.Ball.speed:length() > Settings.slowBall
	
	if self.isShot then --catch ball
		-- block fast balls by moving in their way
		self.moveTo = self._robot.pos:nearestPosOnLine(World.Ball.pos, World.Ball.pos+(World.Ball.speed * 30))
	elseif shootPos then
		self.moveTo = shootPos
	else --higher rating in robots is more free + in the enemy playing field half
		local ballOwner = Observer.friendlyBallOwner()
		local shotDir = ballOwner and ballOwner.dir or (self._robot.pos - World.Ball.pos):angle()

		local distanceToBall = World.Ball.pos:distanceTo(self._robot.pos)
		local robots = {}
		for _, robot in pairs(World.OpponentRobots) do
			if robot.pos:distanceTo(World.Ball.pos) <= distanceToBall then
				table.insert(robots, robot)
			end
		end

		local goalStartAngle = shotDir - math.pi/4
		local goalEndAngle = shotDir + math.pi/4
		local unoccupiedSectors = Goal.getFreeSectors(World.Ball.pos, robots, goalStartAngle, goalEndAngle)

		local bestSector = Interval.getLargest(unoccupiedSectors)
		local sectorMid = bestSector and (bestSector[1]+bestSector[2])/2 or (World.Ball.pos - self._robot.pos):angle()
		self.moveTo = World.Ball.pos + Vector.fromAngle(sectorMid):setLength(distanceToBall)
		self.moveTo = Field.limitToAllowedField(self.moveTo, 0, true)
	end

	return Rating.posToRating(self._robot, self.moveTo)
end

function ReceivePass:_run()
	if self.isShot then
		vis.addCircle("RecivePassMoveTo", self.moveTo, 0.03, vis.colors.blue, true)
		self._robot.path:setDefaultObstacles(self._robot, true)
	else --play free
		vis.addPath("RecivePassSector", {World.Ball.pos, self.moveTo}, vis.colors.red, true)
		self._robot.path:setDefaultObstacles(self._robot)
	end
	
	self._robot.path:addRobotObstacles(self._robot)
	local faceBall = (World.Ball.pos-self.moveTo):angle()
	self._robot.trajectory:update(ToTarget, self.moveTo, faceBall)
	return { targetPos = self.moveTo }
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

return ReceivePass
