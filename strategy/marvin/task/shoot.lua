local Shoot = (require "../base/class").new("Task.Shoot", require "task/catchball")

local Constants = require "../base/constants"
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
function Shoot:_shoot(targetPos, targetSpeed, linearShoot, probabilityThreshold)
	self._shootHysteresis = self._shootHysteresis or 0
	
	if self._robot:hasBall(World.Ball, Settings.shootSideOffset) then -- if we got the ball
		if not self._lastBallSpeed then
			self._lastBallSpeed = World.Ball.speed
		end
		if not self._travelStart then
			self._travelStart = self._robot.pos
			self._travelLimit = false
		end
		
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
			speed = speed + Vector.fromAngle(targetDir):perpendicular():setLength(math.bound(-1, -distToBall.y * 20, 1)) -- correct pos error in 100ms
		end

		local successProbability = self:_successProbability(0)
		debug.set("Success probability", successProbability)
		-- TODO: check future to see whether probability will decrease
		-- TODO: test whether to add a delay when probability decreases

		-- only start kicking if the robot got the ball
		if self._robot:hasBall(World.Ball) and successProbability >= probabilityThreshold then
			self._shootHysteresis = self._shootHysteresis + 2
		else
			self._shootHysteresis = math.max(self._shootHysteresis - 1, 0)
		end

		-- debug.set("travelDist", self._travelStart:distanceTo(self._robot.pos))
		if self._travelStart:distanceTo(self._robot.pos) >= Constants.maxDribbleDistance then
			self._travelLimit = true
		end
		if self._shootHysteresis > 0 and not self._travelLimit then
			-- speed towards ball
			speed = speed + Vector.fromAngle(targetDir):setLength(Settings.shootDriveSpeed)

			local dist = targetPos:distanceTo(self._robot.pos)
			if linearShoot then
				self._robot:shoot(targetSpeed, dist)
			else
				self._robot:chip(dist)
			end
		else
			-- slowly dissolve travel distance
			local travelDist = math.max(self._travelStart:distanceTo(self._robot.pos) - 0.05, 0)
			self._travelStart = self._robot.pos + (self._travelStart - self._robot.pos):setLength(travelDist)
			if travelDist == 0 then
				self._travelLimit = false
			end

			-- keep away from ball
			if distToBall.x < Settings.catchBallDistance then
				local distError = Settings.catchBallDistance - distToBall.x
				speed = speed - Vector.fromAngle(targetDir):setLength(distError * 20)
			end
		end

		self._robot.trajectory:update(TrajectoryDirect, speed, targetDir)

	else -- catch the ball
		self._lastBallSpeed = nil
		self._shootHysteresis = 0
		self._travelStart = nil
		self._travelLimit = false
		self:_catchBall(targetPos, Settings.shootDriveSpeed)
	end
end

return Shoot
