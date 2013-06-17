local Shoot = (require "../base/class").new("Task.Shoot", require "task/catchball")

local World = require "../base/world"
local TrajectoryDirect = require "trajectory/direct"
local debug = require "../base/debug"
local geom = require "../base/geom"
local Observer = {}
Observer.Shoot = require "observer/shoot"

function Shoot:_successProbability()
	error("stub")
end

-- if probability is higher than that threshold, the task will shoot immediatelly
function Shoot:_shoot(targetPos, targetSpeed, linearShoot, probabilityThreshold, dontMoveWithBall)
	self._lastSuccessProbability = self._lastSuccessProbability or 0
	self._shootHysteresis = self._shootHysteresis or 0
	
	if self._robot:hasBall(World.Ball) then -- if we got the ball
		if not self._lastBallSpeed then
			self._lastBallSpeed = World.Ball.speed
		end

		local successProbability = self:_successProbability(0)
		debug.set("Success probability", successProbability)
		-- TODO: check future to see whether probability will decrease
		-- TODO: test whether to add a delay when probability decreases
		if successProbability >= probabilityThreshold
				or successProbability < self._lastSuccessProbability then
			self._shootHysteresis = self._shootHysteresis + 2
		else
			self._shootHysteresis = math.max(self._shootHysteresis - 1, 0)
		end
		self._lastSuccessProbability = successProbability
		
		-- compensate ball movement
		local speed = World.Ball.speed:copy()
		local speedLimit = self._lastBallSpeed:length()
		-- prevent ball speed windup
		if speed:length() > speedLimit then
			speed:setLength(speedLimit)
		end
		-- don't drive backwards if the ball moves towards the robot
		speed = speed:rotate(-self._robot.dir)
		if speed.x < 0 then
			speed.x = 0
		end
		speed = speed:rotate(self._robot.dir)

		-- FIXME drive towards hit point and not where the ball currently is
		local targetDir = (targetPos - World.Ball.pos):angle()
		local distToBall = (World.Ball.pos - self._robot.pos):rotate(-targetDir)
		distToBall.x = distToBall.x - self._robot.shootRadius - World.Ball.radius

		-- sidewards offset
		if math.abs(distToBall.y) >= 0.01 then
			speed = speed + Vector.fromAngle(targetDir):perpendicular():setLength(-distToBall.y * 20) -- correct pos error in 100ms
		end

		-- speed towards ball
		local driveSpeed = (distToBall.x < 0.005 and dontMoveWithBall) and 0.05 or Settings.shootDriveSpeed
		speed = speed + Vector.fromAngle(targetDir):setLength(driveSpeed)
		self._robot.trajectory:update(TrajectoryDirect, speed, targetDir)

		if self._shootHysteresis > 0 then
			local dist = (targetPos-self._robot.pos):length()
			if linearShoot then
				self._robot:shoot(targetSpeed, dist)
				--log("Success Probability: "..successProbability)
			else
				self._robot:chip(dist)
			end
		end
	else -- catch the ball
		self._lastBallSpeed = nil
		self._shootHysteresis = 0
		self._lastSuccessProbability = 0
		self:_catchBall(targetPos, Settings.shootDriveSpeed)
	end
end

return Shoot
