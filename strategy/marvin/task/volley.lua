local Volley = (require "../base/class").new("Task.Volley", require "task/shootgoal")

local MovingAverage = require "learning/movingaverage"
local World = require "../base/world"
local geom = require "../base/geom"
local vis = require "../base/vis"
local Robot = require "observer/robot"
local Ball = require "observer/ball"

Volley.priority = 5

function Volley:_init(viewPos)	
	self._shootSpeed = 8
	self._receiveSpeed = 4
	self._ballComes = true
	MovingAverage.init("Volley", 5, 0.45)
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
	-- update self.targetPoint (mid of largest free goal sector)
	self:updateDestination(false)
	
	-- read mu from Volley file
	self._mu = MovingAverage.getValue("Volley")
	
	-- the ball gets shot at this point (approximately)
	local viewPos = self._robot.pos + (World.Geometry.OpponentGoal - self._robot.pos):setLength(self._robot.shootRadius)
	
	if self._ballComes then
		self._alpha = World.Ball.speed:copy():scaleLength(-1):angle()
	end
	if self._robot:hasBall(World.Ball) then
		self._ballComes = false
	end
	
	local gamma = (self.targetPoint - viewPos):angle()
	local alpha = self._alpha
	
	-- calculate phi
	local k = self._shootSpeed / ((1 - self._mu) * self._receiveSpeed + self._shootSpeed)
	local phi = (gamma + (1 - k) * alpha) / (2 - k)
	
	-- look in the direction of phi
	local viewPoint = geom.intersectLineLine(World.Geometry.OpponentGoal, Vector.create(1, 0), 
			viewPos, Vector.fromAngle(phi))
	
	-- evaluate the shot and learn mu if debug mode is on
	if amun.isDebug then
		if self._robot:hasBall(World.Ball) then
			self._phi = phi
			self._gamma = gamma
			self._alpha = alpha
		end
		if Ball.isShot() == self._robot then
			self._evaluationTime = World.Time + 0.3
			self._evaluationNeeded = true
		end
		if self._evaluationNeeded and World.Time > self._evaluationTime then
			local newgamma = World.Ball.speed:angle()
			local newk = (newgamma + self._alpha - 2*self._phi) / (self._alpha - self._phi)
			local mu = 1 - self._shootSpeed * (1 - newk) / (self._receiveSpeed * newk)
			MovingAverage.adjustValue("Volley", mu)

			self._visPoints = {viewPos + Vector.fromAngle(newgamma):scaleLength(5), viewPos}
			self._visPoints2 = {viewPos + Vector.fromAngle(self._gamma):scaleLength(5), viewPos}
			self._visTimestamp = World.Time
			
			self._evaluationNeeded = false
		end
		if self._visTimestamp and World.Time - self._visTimestamp < 1 then
			vis.addPath("Volley Angle Error", self._visPoints, vis.colors.red)
			vis.addPath("Volley Angle Error", self._visPoints2, vis.colors.blue)
		end
	end
	
	-- catch the ball and shoot
	self._robot:shoot(self._shootSpeed, 0)
	self:_catchBall(viewPoint, Settings.shootDriveSpeed, false)
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
