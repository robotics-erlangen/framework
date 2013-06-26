local Volley = (require "../base/class").new("Task.Volley", require "task/shootgoal")

local Robot = require "observer/robot"
local Goal = require "observer/goal"
local Shoot = require "observer/shoot"

local World = require "../base/world"
local G = World.Geometry
local ball = World.Ball
local geom = require "../base/geom"
local vis = require "../base/vis"


Volley.priority = 5

local t = 0.7

local function robotList(selfRobot, viewPos)
	local robots = {}
	for _,r in pairs(World.Robots) do
		if r.pos.y > viewPos.y and r ~= selfRobot then
			table.insert(robots, r)
		end
	end
	return robots
end

function Volley:_init(origBallPos)
	self._bestMid = G.OpponentGoal
	self._origBallPos = origBallPos
	self._t = t
end

function Volley:_rate()
	return Robot.minTimeToBall(self._robot, World.Ball) 
end

function Volley:canShoot()
	return self:_canShoot()
end

function Volley:_canShoot()
	self:updateDestination()
	local angleDiff = math.abs(geom.getAngleDiff((self.targetPoint - World.Ball.pos):angle(), self._robot.dir))
	
	return self.maxAngleError and angleDiff < self.maxAngleError or angleDiff < Settings.minAnglePrecision
end

function Volley:_run()
	self:updateDestination()
	-- viewPos
	local bla = self._robot.pos
	self._robot.pos = Vector.create(0, 0)
	local t = self._t
	local minPhi = (self._origBallPos - self._robot.pos):angle()
	local maxPhi = (self.targetPoint - self._robot.pos):angle()
	local min = geom.intersectLineLine(World.Geometry.OpponentGoal, Vector.create(1, 0), 
			self._robot.pos, Vector.fromAngle(minPhi))
	local max = geom.intersectLineLine(World.Geometry.OpponentGoal, Vector.create(1, 0), 
			self._robot.pos, Vector.fromAngle(maxPhi))
	if self._origBallPos.x < 0 then
		min, max = max, min
		t = 1-self._t
	end
	self._viewPos = min * (1-t) + max * t
	
	if not self._viewPos then
		self._viewPos = World.Geometry.OpponentGoal
	end
	
	self._robot.pos = bla
	
	vis.addCircle("Volley ViewPos", self._viewPos, 0.2, vis.colors.redHalf, true)
	vis.addCircle("Volley ViewPos", self.targetPoint, 0.1, vis.colors.redHalf, true)
	vis.addCircle("Volley ViewPos", min, 0.1, vis.colors.greenHalf, true)
	vis.addCircle("Volley ViewPos", max, 0.1, vis.colors.greenHalf, true)
	
	-- shoot
	self._robot:shoot(math.huge, 0)
	self:_catchBall(self._viewPos, math.huge, true)
end

function Volley.factory(position)
	local f = function (robots)
		return Volley.create(robots[position])
	end
	return f
end

function Volley.test(id)
	if id > 0 then
		return nil
	end
	return Volley.factory(1), 1
end

return Volley
