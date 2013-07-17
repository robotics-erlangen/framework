local Volley = (require "../base/class").new("Task.Volley", require "task/shootgoal")

local MovingAverage = require "learning/movingaverage"
local World = require "../base/world"
local Robot = require "observer/robot"
local geom = require "../base/geom"

Volley.priority = 5

function Volley:_init(origBallPos, viewPos)	
	self._shootSpeed = 8
	self._receiveSpeed = 4
	self._origBallPos = origBallPos
	self._viewPos = viewPos or self._robot.pos + (World.Geometry.OpponentGoal - self._robot.pos):setLength(self._robot.shootRadius)
	MovingAverage.init("Volley", 5, 0.8)
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
	self:updateDestination(false)
	
	self._mu = MovingAverage.getValue("Volley")
	local gamma = (self.targetPoint - self._viewPos):angle()
	local alpha = (self._origBallPos - self._viewPos):angle()
	local k = self._shootSpeed / ((1 - self._mu) * self._receiveSpeed + self._shootSpeed)
	local phi = (gamma + (1 - k) * alpha) / (2 - k)
	
	local viewPoint = geom.intersectLineLine(World.Geometry.OpponentGoal, Vector.create(1, 0), 
			self._viewPos, Vector.fromAngle(phi))
	
	self._robot:shoot(self._shootSpeed, 0)
	self:_catchBall(viewPoint, 0)
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
