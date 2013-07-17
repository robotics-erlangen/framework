local Volley = (require "../base/class").new("Task.Volley", require "task/shootgoal")

local MovingAverage = require "learning/movingaverage"
local World = require "../base/world"
local geom = require "../base/geom"
local vis = require "../base/vis"
local Robot = require "observer/robot"
local Ball = require "observer/ball"

Volley.priority = 5

function Volley:_init(origBallPos, viewPos)	
	self._shootSpeed = 8
	self._receiveSpeed = 4
	self._origBallPos = origBallPos
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

function Volley:calculatePhi()
	self._viewPos = self._robot.pos + (World.Geometry.OpponentGoal - self._robot.pos):setLength(self._robot.shootRadius)
	local gamma = (self.targetPoint - self._viewPos):angle()
	local alpha = (self._origBallPos - self._viewPos):angle()
	local k = self._shootSpeed / ((1 - self._mu) * self._receiveSpeed + self._shootSpeed)
	local phi = (gamma + (1 - k) * alpha) / (2 - k)
	return phi, gamma, alpha
end

function Volley:_run()
	self:updateDestination(false)
	
	self._mu = MovingAverage.getValue("Volley")
	local phi, gamma, alpha = self:calculatePhi()
	
	local viewPoint = geom.intersectLineLine(World.Geometry.OpponentGoal, Vector.create(1, 0), 
			self._viewPos, Vector.fromAngle(phi))
	
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
			local k = (newgamma + self._alpha - 2*self._phi) / (self._alpha - self._phi)
			local mu = 1 - self._shootSpeed * (1 - k) / (self._receiveSpeed * k)
			MovingAverage.adjustValue("Volley", mu)

			self._visPoints = {self._viewPos + Vector.fromAngle(newgamma):scaleLength(5), self._viewPos}
			self._visPoints2 = {self._viewPos + Vector.fromAngle(self._gamma):scaleLength(5), self._viewPos}
			self._visTimestamp = World.Time
			
			self._evaluationNeeded = false
		end
		if self._visTimestamp and World.Time - self._visTimestamp < 1 then
			vis.addPath("Volley Angle Error", self._visPoints, vis.colors.red)
			vis.addPath("Volley Angle Error", self._visPoints2, vis.colors.blue)
		end
	end
	
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
