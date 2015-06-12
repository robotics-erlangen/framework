local ReceivePass = require "task/ability/receivepass"
local Volley = require "task/ability/volley" -- only for calcPhi
local Shoot = {}

local Constants = require "../base/constants"
local World = require "../base/world"
local TrajectoryDirect = require "trajectory/direct"
local debug = require "../base/debug"
local geom = require "../base/geom"
local vis = require "../base/vis"
local Field = require "../base/field"
local Referee = require "../base/referee"
local Ball = require "observer/ball"

local SIDEWARDS_KP = 8
local MIN_ANGLE_PRECISION = 0.5 / 180 * math.pi
local SHOOT_SIDE_OFFSET = 0.05 -- extends the hasBall sidewards
local FORCE_SHOOT_DELAY = 0.03 -- delay kick by this time
local CHIP_DIST_SCALE = 0.7 -- shorten chip distance as the ball will bounce
local SLOW_BALL = 0.5

Shoot.depends = { ReceivePass, Volley }

function Shoot:init()
	self._shootHysteresis = false
	self._travelStart = nil
	self._travelLimit = false
	self._forceShootTimer = nil
end

-- shoot immediatelly if angle error is below maxAngleError
function Shoot:_shoot(targetPos, targetSpeed, linearShoot, maxAngleError)
	vis.addCircle("t/a/shoot: targetPos", targetPos, 0.04, vis.colors.pinkHalf, true)

	-- don't allow pushing the ball into the opponent defense area
	if self._robot:hasBall(World.Ball, SHOOT_SIDE_OFFSET)
			and (not Field.isInOpponentDefenseArea(self._robot.pos, self._robot.shootRadius)
				or Referee.isFriendlyPenaltyState()) then -- if we got the ball
		debug.set("ballApproach", "hasBall")
		self:_doShoot(targetPos, targetSpeed, linearShoot, maxAngleError)
		-- send the position of the ball
		self._send.attackPosition("all", World.Ball.pos)
	elseif table.count(self._inbox.passPos()) > 0 or Ball.receivesPass(self._robot) then
		debug.set("ballApproach", "receivePass")
		debug.set("shoot command", "none")
		self:_resetShoot()
		self:_receivePass(targetPos)
	else -- catch the ball
		debug.set("shoot command", "none")
		-- just catch the ball, but keep a little distance to allow braking the robot
		self:_resetShoot()
		local ballDist = 2*Constants.positionError
		if World.Ball.speed:length() > SLOW_BALL and (World.Ball.pos - self._robot.pos):dot(World.Ball.speed) < 0 then
			-- the ball is moving towards the robot, no extra distance necessary
			ballDist = 0
			debug.set("ballApproach", "catchBall (no dist)")
		else
			debug.set("ballApproach", "catchBall")
		end

		self:_catchBall(targetPos, ballDist)
	end
	if (not self._catchTime) or self._catchTime < 0.5 then
		self._send.shootDestination("all", targetPos)
		--self._robot:setDribblerSpeed(1)
	end
end

function Shoot:_doShoot(targetPos, targetSpeed, linearShoot, maxAngleError)
	self._lastBallSpeed = self._lastBallSpeed or World.Ball.speed

	if not self._travelStart then
		self._travelStart = self._robot.pos
		self._travelLimit = false
	end

	-- compensate ball movement
	local speed = World.Ball.speed:copy()
	local accel = nil
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

	local targetDir
	if World.Ball.speed:length() >= SLOW_BALL then
		targetDir, targetSpeed = self:calcPhi(World.Ball.speed, World.Ball.pos,
				targetPos, targetSpeed)
	else
		targetDir = (targetPos - World.Ball.pos):angle()
	end

	-- calculate current distance to the ball
	local distToBall = (World.Ball.pos - self._robot.pos):rotate(-targetDir)
	distToBall.x = distToBall.x - self._robot.shootRadius - World.Ball.radius

	if World.Ball.speed:length() >= SLOW_BALL then
		local speedDiff = World.Ball.speed - self._robot.speed
		local posDiff = World.Ball.pos - self._robot.pos
		if speedDiff:length() >= SLOW_BALL and speedDiff:dot(posDiff) < 0 then
			debug.set("special", "shot at robot")
			-- ball shoot towards robots
			local balldir = World.Ball.speed:copy():normalize()
			local robotFront = self._robot.pos + Vector.fromAngle(targetDir) * (self._robot.shootRadius + World.Ball.radius)
			-- calculate sidewards offset of ball hitpoint
			local _, _, lambda = geom.intersectLineLine(World.Ball.pos, balldir, robotFront, balldir:perpendicular())
			distToBall = Vector(posDiff:length() - self._robot.shootRadius - World.Ball.radius, lambda)
		end
	end
	debug.set("distToBall", distToBall)

	-- sidewards offset
	local speedLimit = 0.4
	speed = speed + Vector.fromAngle(targetDir):perpendicular():setLength(
			math.bound(-speedLimit, -distToBall.y * SIDEWARDS_KP, speedLimit)) -- correct pos error

	-- check robot orientation
	local angleDiff = math.abs(geom.getAngleDiff(targetDir, self._robot.dir))
	local canShoot = angleDiff < math.max(MIN_ANGLE_PRECISION, maxAngleError)
	debug.set("canShoot", canShoot)

	-- only start kicking if the robot got the ball
	if self._robot:hasBall(World.Ball) then
		-- shootHysteresis stays true after maxAngleError was satisfied once
		if canShoot then
			self._shootHysteresis = true
		end
	else
		self._shootHysteresis = false
	end

	debug.set("hasBall hysteresis", self._shootHysteresis)

	vis.addPath("t/a/shoot: Direction", { self._robot.pos, self._robot.pos + Vector.fromAngle(self._robot.dir)*20 }, vis.colors.blue)
	vis.addPath("t/a/shoot: Direction", { self._robot.pos, self._robot.pos + Vector.fromAngle(targetDir)*20 }, vis.colors.pink)

	-- debug.set("travelDist", self._travelStart:distanceTo(self._robot.pos))
	if self._travelStart:distanceTo(self._robot.pos) >= Constants.maxDribbleDistance then
		self._travelLimit = true
	end
	if self._shootHysteresis and not self._travelLimit then
		-- speed towards ball
		local accelerate = math.abs(self._robot.acceleration
				and self._robot.acceleration.aSpeedupFMax or 1.0) * 0.4
		accel = Vector.fromAngle(targetDir) * accelerate

		local dist = targetPos:distanceTo(self._robot.pos)
		if linearShoot then
			self._robot:shoot(targetSpeed, dist)
			debug.set("shoot command", "linear")
		else
			self._robot:chip(dist*CHIP_DIST_SCALE)
			debug.set("shoot command", "chip")
		end
		if self._robot.radioResponse then
			debug.set("light barrier", self._robot.radioResponse.ball_detected)
		end
		-- Ignore the IR if the robot has the ball
		local relpos = (World.Ball.pos - self._robot.pos):rotate(-self._robot.dir)
		-- assume the ball is "pushed" into the robot due to tracking latency
		if relpos.x < self._robot.shootRadius + World.Ball.radius - 0.002 and World.Ball:isPositionValid() then
			-- initialize if neccessary
			self._forceShootTimer = self._forceShootTimer or World.Time
			if World.Time - self._forceShootTimer >= FORCE_SHOOT_DELAY then
				debug.set("force shoot", true)
				self._robot:forceShoot()
			end
		else
			-- reset time
			self._forceShootTimer = World.Time
		end
	else
		self._shootHysteresis = false
		self._forceShootTimer = nil

		-- slowly dissolve travel distance
		local travelDist = math.max(self._travelStart:distanceTo(self._robot.pos) - 5 * World.TimeDiff, 0)
		self._travelStart = self._robot.pos + (self._travelStart - self._robot.pos):setLength(travelDist)
		if travelDist == 0 then
			self._travelLimit = false
		end

		-- keep distance to the ball
		local minDist
		if self._travelLimit then
			minDist = minDist + 0.06
		elseif World.Ball.speed:length() > SLOW_BALL then
			-- don't keep any distance to a moving ball
			minDist = 0
		else
			-- don't push the ball until the robot is correctly oriented
			minDist = Constants.positionError + 0.01
		end
		if distToBall.x < minDist then
			local distError = minDist - distToBall.x
			speed = speed - Vector.fromAngle(targetDir):setLength(distError * 20)
		end

		debug.set("shoot command", "none")
	end

	self._robot.trajectory:update(TrajectoryDirect, speed, targetDir, nil, accel)
end

function Shoot:_resetShoot()
	self._shootHysteresis = false
	self._travelStart = nil
	self._travelLimit = false
end


return Shoot
