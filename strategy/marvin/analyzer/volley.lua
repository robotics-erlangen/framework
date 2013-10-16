local Volley = (require "../base/class").new("Process.Volley", require "../base/process")
local World = require "../base/world"
local Ball = require "observer/ball"

function Volley:init(robot, movingAverage)
	self._robot = robot
	self._exitTimer = World.Time + 1
	self._movingAverage = movingAverage
end

-- get used params, also used for keep-alive
function Volley:update(alpha, gamma)
	self._exitTimer = World.Time + 1
	self._alpha = alpha
	self._gamma = gamma
end

function Volley:run()
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
		self._movingAverage:addValue(mu)

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

function Volley:isFinished()
	if World.Time > self._exitTimer then
		return true
	end
	return false
end

return Volley
