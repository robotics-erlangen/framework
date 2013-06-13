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
		
		-- FIXME drive towards hit point and not where the ball currently is
		local distToBall = self._robot:posToBall(World.Ball)
		local targetDir = (targetPos - World.Ball.pos):angle()
		local speed = World.Ball.speed
		if math.abs(distToBall.y) >= 0.01 then
			speed = Vector.fromAngle(targetDir):perpendicular():setLength(distToBall.y / 10) -- correct pos error in 100ms
		end

		if not (distToBall.x < 0.005 and dontMoveWithBall) then
			local speedDir = (World.Ball.pos - self._robot.pos):angle()
			-- double angle between targetDir and speedDir, but limit to 90 degree
			local speedAngle = targetDir + math.bound(-math.pi/2, 2*geom.getAngleDiff(targetDir, speedDir), math.pi/2)
			speed = speed + Vector.fromAngle(speedAngle):setLength(Settings.shootDriveSpeed)
		end
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
		self._shootHysteresis = 0
		self._lastSuccessProbability = 0
		self:_catchBall(targetPos, Settings.shootDriveSpeed)
	end
end

return Shoot
