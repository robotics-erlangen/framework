local PassTarget = (require "../base/class").new("Task.PassTarget", require "task/base")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Observer = require "observer/ball"
local vis = require "../base/vis"
local Goal = require "observer/goal"
local Interval = require "util/interval"
local Field = require "util/field"

PassTarget.priority = 5

function PassTarget:_init()
	self.moveTo = nil
end

function PassTarget:run()
	local passPos = nil

	for _, pos in pairs(self._inbox.passPos()) do
		passPos = pos
	end

	if passPos then
		self.moveTo = passPos
	else --higher rating if robots is more free + in the enemy playing field half
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
		if distanceToBall < 1 then
			distanceToBall = 1
		end
		self.moveTo = World.Ball.pos + Vector.fromAngle(sectorMid):setLength(distanceToBall)
		self.moveTo = Field.limitToAllowedField(self.moveTo, 0, true)
	end

	vis.addPath("RecivePassSector", {World.Ball.pos, self.moveTo}, vis.colors.red, true)
	self._robot.path:setDefaultObstacles(self._robot)
	
	self._robot.path:addRobotObstacles(self._robot)
	local faceBall = (World.Ball.pos-self.moveTo):angle()
	self._robot.trajectory:update(ToTarget, self.moveTo, faceBall)
	self._send("all").moveDest(self.moveTo)
end

return PassTarget
