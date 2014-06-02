local Shoot = (require "../base/class").new("Task.Shoot", require "task/catchball")

local Constants = require "../base/constants"
local World = require "../base/world"
local TrajectoryDirect = require "trajectory/direct"
local debug = require "../base/debug"
local geom = require "../base/geom"
local Observer = {}
Observer.Shoot = require "observer/shoot"

function Shoot:_canShoot()
	error("stub")
end

-- if probability is higher than that threshold, the task will shoot immediatelly
function Shoot:_shoot(targetPos, targetSpeed, linearShoot)
	local isShooting = false
	local shootDriveSpeed = (World.RefereeState == "PenaltyOffensive")
			and Settings.penaltyShootDriveSpeed or Settings.shootDriveSpeed
	local sidewardsK = (World.RefereeState == "PenaltyOffensive")
			and 15 or 13
	
	if self._robot:hasBall(World.Ball, Settings.shootSideOffset) then -- if we got the ball
		self._ballInDribblerPos = World.Ball.pos

		if not linearShoot then
			self._robot:setDribblerSpeed(1)
		end
		
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
		local speedLimit = 0.2
		speed = speed + Vector.fromAngle(targetDir):perpendicular():setLength(
				math.bound(-speedLimit, -distToBall.y * sidewardsK, speedLimit)) -- correct pos error

		local canShoot = self:_canShoot()
		debug.set("Success probability", canShoot)

		-- only start kicking if the robot got the ball
		if self._robot:hasBall(World.Ball) then
			if canShoot then
				self._shootHysteresis = true
			end
		else
			self._shootHysteresis = false
		end

		-- debug.set("travelDist", self._travelStart:distanceTo(self._robot.pos))
		if self._travelStart:distanceTo(self._robot.pos) >= Constants.maxDribbleDistance then
			self._travelLimit = true
		end
		if self._shootHysteresis and not self._travelLimit then
			isShooting = true
			-- speed towards ball
			speed = speed + Vector.fromAngle(targetDir):setLength(shootDriveSpeed)

			debug.set("shoot", true)
			local dist = targetPos:distanceTo(self._robot.pos)
			if linearShoot then
				self._robot:shoot(targetSpeed, dist)
			else
				self._robot:chip(dist)
			end
		else
			debug.set("shoot", false)
			self._shootHysteresis = false

			-- slowly dissolve travel distance
			local travelDist = math.max(self._travelStart:distanceTo(self._robot.pos) - 0.05, 0)
			self._travelStart = self._robot.pos + (self._travelStart - self._robot.pos):setLength(travelDist)
			if travelDist == 0 then
				self._travelLimit = false
			end

			-- keep distance to the ball
			local minDist = Constants.positionError + 0.018
			if distToBall.x < minDist then
				local distError = minDist - distToBall.x
				speed = speed - Vector.fromAngle(targetDir):setLength(distError * 20)
			end
		end

		self._robot.trajectory:update(TrajectoryDirect, speed, targetDir)

	else -- catch the ball
		self._lastBallSpeed = nil
		self._shootHysteresis = false
		self._travelStart = nil
		self._travelLimit = false
		-- just catch the ball, but keep a little distance to allow braking the robot
		local catchPos = self:_catchBall(targetPos, Constants.positionError)
		self._ballInDribblerPos = catchPos + (targetPos - catchPos):
				setLength(self._robot.shootRadius + World.Ball.radius)
	end
	if (not self._catchTime) or self._catchTime < 0.5 then
		self._send("all").shootDestination(targetPos)
	end
	return self._ballInDribblerPos
end

return Shoot
