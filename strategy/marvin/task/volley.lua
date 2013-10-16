local Volley = (require "../base/class").new("Task.Volley", require "task/shootgoal")

local MovingAverage = require "learning/movingaverage"
local World = require "../base/world"
local geom = require "../base/geom"
local vis = require "../base/vis"
local Ball = require "observer/ball"
local Processor = require "../base/processor"
local Analyzer = require "analyzer/volley"


Volley.priority = 5

function Volley:_init(viewPos)	
	self._shootSpeed = 8
	self._ballIncoming = true
	self._movingAverage = MovingAverage.get("Volley", 5, 0.45)
	if amun.isDebug then
		self._analyzer = Analyzer.create(self._robot, self._movingAverage)
		Processor.addPost(self._analyzer)
	end
end

function Volley:canShoot()
	return self:_canShoot()
end

function Volley:_canShoot()
	self:updateDestination()
	local angleDiff = math.abs(geom.getAngleDiff((self.targetPoint - World.Ball.pos):angle(), self._robot.dir))
	
	return self.maxAngleError and angleDiff < self.maxAngleError or angleDiff < Settings.minAnglePrecision
end

function Volley:run()
	-- update self.targetPoint (mid of largest free goal sector)
	self:updateDestination(false)
	
	-- read mu from Volley file
	self._mu = self._movingAverage:value()
	
	-- the ball gets shot at this point (approximately)
	local viewPos = self._robot.pos + (self.targetPoint - self._robot.pos):setLength(self._robot.shootRadius + World.Ball.radius)
	
	if self._ballIncoming then
		self._alpha = World.Ball.speed:copy():scaleLength(-1):angle()
	end
	if self._robot:hasBall(World.Ball) then
		self._ballIncoming = false
	end
	
	local gamma = (self.targetPoint - viewPos):angle()
	local alpha = self._alpha
	
	-- predict ball speed when we catch it
	local receiveTime = Ball.ballRollTime(World.Ball.speed:length(), viewPos:distanceTo(World.Ball.pos))
	local receiveBall = Ball.atTime(receiveTime, World.Ball)
	self._receiveSpeed = receiveBall.speed:length()

	self._shootSpeed = 6.3
	-- calculate phi
	local k = self._shootSpeed / ((1 - self._mu) * self._receiveSpeed + self._shootSpeed)
	local phi = (gamma + (1 - k) * alpha) / (2 - k)
	
	-- look in the direction of phi
	local viewPoint = geom.intersectLineLine(World.Geometry.OpponentGoal, Vector.create(1, 0), 
			viewPos, Vector.fromAngle(phi))
	
	-- evaluate the shot and learn mu if debug mode is on
	if amun.isDebug then
		if self._ballIncoming or self._robot:hasBall(World.Ball) then
			self._analyzer:update(alpha, gamma)
		end
	end
	
	-- catch the ball and shoot
	self._robot:shoot(8, 0)
	self:_catchBall(viewPoint, Settings.shootDriveSpeed)
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
