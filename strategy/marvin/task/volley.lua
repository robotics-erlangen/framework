local Volley = (require "../base/class").new("Task.Volley", require "task/shootgoal")
local VolleyAnalyzer = (require "../base/class").new("Task.Volley.Analyzer", require "../base/process")

local MovingAverage = require "learning/movingaverage"
local World = require "../base/world"
local geom = require "../base/geom"
local vis = require "../base/vis"
local Ball = require "observer/ball"
local Processor = require "../base/processor"


Volley.priority = 5


function VolleyAnalyzer:init(robot, movingAverage)
	self._robot = robot
	self._exitTimer = World.Time + 1
	self._movingAverage = movingAverage
	self._hasFinished = false
end

-- get used params, also used for keep-alive
function VolleyAnalyzer:update(alpha, gamma)
	self._exitTimer = World.Time + 1
	self._alpha = alpha
	self._gamma = gamma
end

function VolleyAnalyzer:run()
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
			self._dribblerPos = World.Ball.pos
		end
		--log("ball")
	end
	if Ball.isShot() == self._robot then
		self._evaluationTime = World.Time + 0.15
		--log("shot")
	end
	if not self._hasFinished and self._evaluationTime and World.Time > self._evaluationTime then
		-- FIXME get real shoot speed
		self._shootSpeed = World.Ball.speed:length()
		local newgamma = World.Ball.speed:angle()
		local newk = (newgamma + self._alpha - 2*self._phi) / (self._alpha - self._phi)
		local mu = 1 - self._shootSpeed * (1 - newk) / (self._receiveSpeed * newk)
		log(self._shootSpeed)
		log(self._receiveSpeed)
		log("write volley mu")
		self._movingAverage:addValue(mu)

		self._visPoints = {self._dribblerPos + Vector.fromAngle(newgamma):scaleLength(5), self._dribblerPos}
		self._visPoints2 = {self._dribblerPos + Vector.fromAngle(self._gamma):scaleLength(5), self._dribblerPos}
		
		self._evaluationTime = nil
		self._exitTimer = World.Time + 1
		self._hasFinished = true
	end
	if self._visPoints then
		vis.addPath("Volley Angle Error", self._visPoints, vis.colors.red)
		vis.addPath("Volley Angle Error", self._visPoints2, vis.colors.blue)
	end
end

function VolleyAnalyzer:isFinished()
	if World.Time > self._exitTimer then
		return true
	end
	return false
end



function Volley:_init()	
	log("start volley task on robot "..tostring(self._robot))
	self._shootSpeed = 8
	self._ballIncoming = true
	self._movingAverage = MovingAverage.get("Volley", 5, 0.45)
	if amun.isDebug then
		self._analyzer = VolleyAnalyzer.create(self._robot, self._movingAverage)
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
	local dribblerPos = self._robot.pos + (self.targetPoint - self._robot.pos):setLength(self._robot.shootRadius + World.Ball.radius)
	
	if self._ballIncoming then
		self._alpha = World.Ball.speed:copy():scaleLength(-1):angle()
	end
	if self._robot:hasBall(World.Ball) then
		self._ballIncoming = false
	end
	
	local gamma = (self.targetPoint - dribblerPos):angle()
	local alpha = self._alpha
	
	-- predict ball speed when we catch it
	local receiveTime = Ball.ballRollTime(World.Ball.speed:length(), dribblerPos:distanceTo(World.Ball.pos))
	local receiveBall = Ball.atTime(receiveTime, World.Ball)
	self._receiveSpeed = receiveBall.speed:length()

	self._shootSpeed = 6.3
	-- calculate phi
	local k = self._shootSpeed / ((1 - self._mu) * self._receiveSpeed + self._shootSpeed)
	local phi = (gamma + (1 - k) * alpha) / (2 - k)
	
	-- look in the direction of phi
	local viewPoint = dribblerPos + Vector.fromAngle(phi)
	
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

return Volley
