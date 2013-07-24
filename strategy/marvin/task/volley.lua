local Volley = (require "../base/class").new("Task.Volley", require "task/shootgoal")

local MovingAverage = require "learning/movingaverage"
local World = require "../base/world"
local geom = require "../base/geom"
local vis = require "../base/vis"
local Robot = require "observer/robot"
local Ball = require "observer/ball"
local Observer = require "observer/observer"

local VolleyObserver = (require "../base/class").new("Task.Volley.Observer", require "observer/timedobserver")

Volley.priority = 5

function Volley:_init(viewPos)	
	self._shootSpeed = 8
	self._ballIncoming = true
	MovingAverage.init("Volley", 5, 0.45)
	if amun.isDebug then
		self._observer = VolleyObserver.create(self._robot)
		Observer.addTimedObserver(self._observer)
	end
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
			self._observer:update(alpha, gamma)
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

function VolleyObserver:init(robot)
	self._robot = robot
	self._exitTimer = World.Time + 1
end

-- get used params, also used for keep-alive
function VolleyObserver:update(alpha, gamma)
	self._exitTimer = World.Time + 1
	self._alpha = alpha
	self._gamma = gamma
end

function VolleyObserver:run()
	-- params are missing
	if not self._alpha or not self._gamma then
		return
	end

	-- get parameters just before the ball is shot
	if self._robot:hasBall(World.Ball) then
		self._phi = self._robot.dir
		-- receive speed only makes sense before the ball hits the robot
		if not self._receiveSpeed then
			self._receiveSpeed = World.Ball.speed:length()
			-- FIXME intersect with dribbler
			self._viewPos = World.Ball.pos
		end
		--log("ball")
	end
	if Ball.isShot() == self._robot then
		self._evaluationTime = World.Time + 0.15
		--log("shot")
	end
	if self._evaluationTime and World.Time > self._evaluationTime then
		-- FIXME get real shoot speed
		self._shootSpeed = World.Ball.speed:length()
		local newgamma = World.Ball.speed:angle()
		local newk = (newgamma + self._alpha - 2*self._phi) / (self._alpha - self._phi)
		local mu = 1 - self._shootSpeed * (1 - newk) / (self._receiveSpeed * newk)
		log(self._shootSpeed)
		log(self._receiveSpeed)
		log("write volley mu")
		MovingAverage.adjustValue("Volley", mu)

		self._visPoints = {self._viewPos + Vector.fromAngle(newgamma):scaleLength(5), self._viewPos}
		self._visPoints2 = {self._viewPos + Vector.fromAngle(self._gamma):scaleLength(5), self._viewPos}
		
		self._evaluationTime = nil
		self._exitTimer = World.Time + 1
	end
	if self._visPoints then
		vis.addPath("Volley Angle Error", self._visPoints, vis.colors.red)
		vis.addPath("Volley Angle Error", self._visPoints2, vis.colors.blue)
	end
end

function VolleyObserver:isFinished()
	if World.Time > self._exitTimer then
		return true
	end
	return false
end

return Volley
