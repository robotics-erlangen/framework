local CatchBall = require "task/ability/catchball"
local ForceShoot = require "task/ability/forceshoot"
local Shoot = {}

local Constants = require "../base/constants"
local World = require "../base/world"
local debug = require "../base/debug"
local geom = require "../base/geom"
local vis = require "../base/vis"
local Field = require "../base/field"
local Referee = require "../base/referee"
local Ball = require "observer/ball"
local Physics = require "observer/physics"
local TrajectoryDirect = require "trajectory/direct"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local Robot = require "observer/robot"

local SIDEWARDS_KP = 9
local SIDEWARDS_KI = 2.4
local MIN_ANGLE_PRECISION = 0.5 / 180 * math.pi
local SHOOT_SIDE_OFFSET = 0.03 -- extends the hasBall sidewards
local SHOOT_HYSTERESIS_TIMEOUT = 0.08 -- reset shoot hysteresis after the timeout
local CAN_SHOOT_HYSTERESIS = 0.5 / 180 * math.pi
local MIN_SHOOT_SPEED = 0.7

local MOVING_BALL = 0.6
local STOPPED_BALL = 0.2
local STOPPED_BALL_DIST = 2*Constants.positionError

local SAFETY_TIME = 0.2
local SAFETY_TIME_HYSTERESIS = 0.2
local BLOCK_ANGLE = 65 / 180 * math.pi
local BLOCK_HYSTERESIS = 10 / 180 * math.pi
local OPP_TIME_HYSTERESIS = 0.1
local IN_THE_RUN = 1.5

-- note: CatchBall depends on Volley
Shoot.depends = { CatchBall, ForceShoot }

function Shoot:init()
	self._shootHysteresis = false
	self._canShootHysteresis = false
	self._shootHysteresisTimer = 0
	self._sideOffsetErrorSum = 0

	self._travelStart = nil
	self._travelLimit = false

	self._movingBallHysteresis = false
	self._stopBallHysteresis = false
	self._receivePassHysteresis = false
	self._oppTimeHysteresis = false
	-- Ball is fast but slow enough to reach it
	self._inTheRunHysteresis = false
end

-- shoot immediatelly if angle error is below maxAngleError
function Shoot:_shoot(targetPos, targetSpeed, linearShoot, maxAngleError, dontShoot)
	local robotFront = self._robot.pos + Vector.fromAngle(self._robot.dir) * (self._robot.shootRadius + World.Ball.radius)
	local ballRollTime = Physics.ballRollTime(World.Ball, World.Ball.pos:distanceTo(robotFront))
	local futureBall = Physics.ballAtTime(World.Ball, ballRollTime)

	if World.Ball.speed:length() > MOVING_BALL then
		self._movingBallHysteresis = true
	elseif World.Ball.speed:length() < STOPPED_BALL then
		self._movingBallHysteresis = false
	end

	local shotAtBack = (targetPos - self._robot.pos):dot(World.Ball.speed) > 0
			and (targetPos - self._robot.pos):dot(World.Ball.pos - self._robot.pos) < 0
	if shotAtBack and self._movingBallHysteresis then
		self._inTheRunHysteresis = false
	elseif futureBall.speed:length() > IN_THE_RUN then
		self._inTheRunHysteresis = false
	elseif futureBall.speed:length() < IN_THE_RUN - 0.2 then
		self._inTheRunHysteresis = true
	end

	-- stop ball if angle is too sharp
	if self._movingBallHysteresis then
		local angleToBall = World.Ball.speed:absoluteAngleDiff(self._robot.pos - targetPos)
		if self._inTheRunHysteresis and angleToBall > math.pi / 2 then
			angleToBall = math.pi - angleToBall
		end
		if angleToBall > BLOCK_ANGLE then
			self._stopBallHysteresis = true
		elseif angleToBall < BLOCK_ANGLE - BLOCK_HYSTERESIS then
			self._stopBallHysteresis = false
		end
	else
		self._stopBallHysteresis = false
	end

	vis.addCircle("t/a/shoot: targetPos", targetPos, 0.04, vis.colors.pinkHalf, true)
	debug.set("stopBall", self._stopBallHysteresis)
	debug.set("inTheRun", self._inTheRunHysteresis)
	local catchTime = 0

	-- don't allow pushing the ball into the opponent defense area
	if self._robot:hasBall(World.Ball, SHOOT_SIDE_OFFSET)
			and not self._stopBallHysteresis
			and (targetPos - self._robot.pos):absoluteAngleDiff(World.Ball.pos - self._robot.pos) < math.pi / 4
			and (not Field.isInOpponentDefenseArea(self._robot.pos, self._robot.shootRadius)
				or Referee.isFriendlyPenaltyState()) then -- if we got the ball
		debug.set("ballApproach", "hasBall")
		self:_doShoot(targetPos, targetSpeed, linearShoot, maxAngleError, dontShoot)
		-- send the position of the ball
		self._send.attackPosition("all", World.Ball.pos)
	else
		debug.set("shoot command", "none")
		self:_resetShoot()
		catchTime = self:_doCatch(targetPos, targetSpeed, futureBall)
	end

	if catchTime < 0.5 then
		self._send.shootDestination("all", targetPos)
	end
end

function Shoot:_doCatch(targetPos, targetSpeed, futureBall)
	-- face the ball if it should be stopped
	if self._stopBallHysteresis then
		targetPos = World.Ball.pos - World.Ball.speed
	end

	if self._movingBallHysteresis and (table.count(self._inbox.passPos()) > 0 or Ball.receivesPass(self._robot)) then
		local moveTime = self:_tryReceivePass(targetPos, targetSpeed, futureBall)
		if moveTime then
			debug.set("ballApproach", "receivePass")
			return moveTime
		end
	end
	self._receivePassHysteresis = false

	if World.Ball.speed.y > 0 then
		self._robot:setDribblerSpeed(0.3)
	end

	-- universal catch ball
	-- just catch the ball, but keep a little distance to allow braking the robot
	local ballOffset = (World.Ball.pos - self._robot.pos):rotate(-self._robot.dir)
	local ballDist
	if self._movingBallHysteresis and ballOffset.x > 0 then
		-- the ball is infront of the robot, no extra distance necessary
		ballDist = 0
		debug.set("ballApproach", "catchBall (no dist)")
	else
		ballDist = STOPPED_BALL_DIST
		debug.set("ballApproach", "catchBall")
	end

	return self:_catchBall(targetPos, ballDist, targetSpeed)
end

function Shoot:_tryReceivePass(targetPos, targetSpeed, futureBall)
	local robotFront = self._robot.pos + Vector.fromAngle(self._robot.dir) * (self._robot.shootRadius + World.Ball.radius)
	local viewDir, _ = self:calcPhi(futureBall.speed, futureBall.pos,
				targetPos, targetSpeed)
	local ballPos = robotFront:nearestPosOnLine(World.Ball.pos, World.Ball.pos+(World.Ball.speed * 30))
	local ballDist = ballPos:distanceTo(World.Ball.pos)

	local robotPos = ballPos - Vector.fromAngle(viewDir):scaleLength(self._robot.shootRadius + World.Ball.radius)

	local moveTime = Physics.robotTimeToPos(self._robot, robotPos, Vector.create(0,0))
	local ballTime = Physics.ballRollTime(World.Ball, ballDist)

	local waitTime = ballTime - moveTime

	--see if an opponent is closer to the ball
	local minTimeOpp = math.huge
	for _,r in pairs(World.OpponentRobots) do
		local tmp = Robot.minTimeToBall(r)
		if tmp < minTimeOpp then
			minTimeOpp = tmp
		end
	end
	debug.set("wait time", waitTime)
	debug.set("opp time", minTimeOpp)

	-- hysteresis around the time
	if minTimeOpp > waitTime + OPP_TIME_HYSTERESIS then
		self._oppTimeHysteresis = false
	elseif minTimeOpp < waitTime - OPP_TIME_HYSTERESIS then
		self._oppTimeHysteresis = true
	end

	-- wait for recieving the ball
	if self._oppTimeHysteresis or waitTime > SAFETY_TIME
			or (self._receivePassHysteresis and waitTime > SAFETY_TIME - SAFETY_TIME_HYSTERESIS) then
		if self._oppTimeHysteresis then
			-- move to the ball if the opponent would be there before us
			moveTime = Physics.robotTimeToBall(self._robot, World.Ball, targetPos, 0)
			local ball = Physics.ballAtTime(World.Ball, moveTime)
			ballPos = ball.pos
			robotPos = ballPos - Vector.fromAngle(viewDir):scaleLength(self._robot.shootRadius + World.Ball.radius)
		end

		-- block ball by moving in its way
		PathHelper.setDefaultObstacles(self._robot.path, self._robot, true)
		PathHelper.addRobotObstacles(self._robot.path, self._robot)
		self._robot.trajectory:update(ToTarget, robotPos, viewDir)
		self._robot:setDribblerSpeed(0.2)
		self._receivePassHysteresis = true
		self._send.moveDest("all", robotPos)
		-- send the position where the ball is catched
		self._send.attackPosition("all", ballPos)
		debug.set("Moving to Ball", self._oppTimeHysteresis)

		return moveTime
	end
	return nil
end

function Shoot:_calculateDistToBall()
	-- calculate current distance to the ball
	local distToBall = (World.Ball.pos - self._robot.pos):rotate(-self._robot.dir)
	distToBall.x = distToBall.x - self._robot.shootRadius - World.Ball.radius

	if self._movingBallHysteresis then
		local posDiff = World.Ball.pos - self._robot.pos
		if World.Ball.speed:length() >= MOVING_BALL and World.Ball.speed:dot(posDiff) < 0 then
			debug.set("special", "shot at robot")
			-- ball shoot towards robots
			local ballTouchPos = self._robot.pos + Vector.fromAngle(self._robot.dir)*(self._robot.shootRadius+World.Ball.radius)
			local dribblerPerp = Vector.fromAngle(self._robot.dir):perpendicular()
			-- calculate offset to ball hitpoint
			local _, _, lambda = geom.intersectLineLine(World.Ball.pos, World.Ball.speed, ballTouchPos, dribblerPerp)
			local errorVec = dribblerPerp * lambda
			distToBall = errorVec:rotate(-self._robot.dir)
		end
	end
	debug.set("distToBall", distToBall)
	return distToBall
end

function Shoot:_checkShootHysteresis(targetDir, maxAngleError, dontShoot)
	-- check robot orientation
	local angleDiff = math.abs(geom.getAngleDiff(targetDir, self._robot.dir))
	local csHysteresis = math.min(maxAngleError / 2, CAN_SHOOT_HYSTERESIS)

	if angleDiff < maxAngleError - csHysteresis then
		self._canShootHysteresis = true
	elseif angleDiff > maxAngleError then
		self._canShootHysteresis = false
	end

	-- only start kicking if the robot got the ball
	if self._robot:hasBall(World.Ball, -0.01) then
		-- shootHysteresis stays true after maxAngleError was satisfied once
		if self._canShootHysteresis then
			self._shootHysteresis = true
			self._shootHysteresisTimer = World.Time
		elseif self._shootHysteresisTimer + SHOOT_HYSTERESIS_TIMEOUT >= World.Time then
			self._shootHysteresis = false
		end
	else
		self._shootHysteresis = false
	end

	-- don't shoot if told so
	if dontShoot then
		self._canShootHysteresis = false
		self._shootHysteresis = false
	end

	debug.set("canShoot", self._canShootHysteresis)
	debug.set("hasBall hysteresis", self._shootHysteresis)
end

function Shoot:_correctSidewardsOffset(distToBall)
	local speedLimit = 0.4
	local sidewardsKp = SIDEWARDS_KP
	local errorVal = -distToBall.y
	local p_out = sidewardsKp * errorVal

	local errorMax = math.bound(0, speedLimit - p_out, speedLimit)
	local errorMin = math.bound(-speedLimit, -speedLimit - p_out, 0)
	self._sideOffsetErrorSum = math.bound(errorMin, self._sideOffsetErrorSum + SIDEWARDS_KI * p_out * World.TimeDiff, errorMax)
	debug.set("sideIntegral", self._sideOffsetErrorSum)

	 -- correct sidewards pos error
	return Vector.fromAngle(self._robot.dir):perpendicular():setLength(
			math.bound(-speedLimit, p_out + self._sideOffsetErrorSum, speedLimit))

end

function Shoot:_doShoot(targetPos, targetSpeed, linearShoot, maxAngleError, dontShoot)
	self._lastBallSpeed = self._lastBallSpeed or World.Ball.speed
	maxAngleError = math.max(MIN_ANGLE_PRECISION, maxAngleError)

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

	-- calculate shoot direction
	local ballTouchPos = self._robot.pos + Vector.fromAngle(self._robot.dir)*(self._robot.shootRadius+World.Ball.radius)
	local ballRollTime = Physics.ballRollTime(World.Ball, World.Ball.pos:distanceTo(ballTouchPos))
	local futureBall = Physics.ballAtTime(World.Ball, ballRollTime)
	local targetDir, kickSpeed = self:calcPhi(futureBall.speed, futureBall.pos,
				targetPos, targetSpeed)
	kickSpeed = math.max(MIN_SHOOT_SPEED, kickSpeed)

	local distToBall = self:_calculateDistToBall()
	-- sidewards offset
	speed = speed + self:_correctSidewardsOffset(distToBall)

	vis.addPath("t/a/shoot: Direction", { self._robot.pos, self._robot.pos + Vector.fromAngle(targetDir)*20 }, vis.colors.redHalf)
	-- handle robot shoot direction problem
	-- 4.2 degree / cm off
	local SHOOT_SKEW = 4.2 / 180 * math.pi * 100
	local SHOOT_SKEW_LIMIT = 3 / 180 * math.pi
	targetDir = targetDir - math.bound(-SHOOT_SKEW_LIMIT, distToBall.y * SHOOT_SKEW, SHOOT_SKEW_LIMIT)
	self:_checkShootHysteresis(targetDir, maxAngleError, dontShoot)

	vis.addPath("t/a/shoot: Direction", { self._robot.pos, self._robot.pos + Vector.fromAngle(self._robot.dir)*20 }, vis.colors.blue)
	vis.addPath("t/a/shoot: Direction", { self._robot.pos, self._robot.pos + Vector.fromAngle(targetDir)*20 }, vis.colors.pink)
	local rawPhi = (targetPos - futureBall.pos):angle()
	vis.addPath("t/a/shoot: Direction simple", { self._robot.pos, self._robot.pos + Vector.fromAngle(rawPhi)*20 }, vis.colors.greenHalf)

	-- debug.set("travelDist", self._travelStart:distanceTo(self._robot.pos))
	if self._travelStart:distanceTo(self._robot.pos) >= Constants.maxDribbleDistance then
		self._travelLimit = true
	end
	if self._shootHysteresis and not self._travelLimit then
		-- speed towards ball
		local accelerate = math.abs(self._robot.acceleration
				and self._robot.acceleration.aSpeedupFMax or 1.0) * 1.4
		accel = Vector.fromAngle(targetDir) * accelerate

		local dist = targetPos:distanceTo(self._robot.pos)
		if linearShoot then
			self._robot:shoot(kickSpeed, true)
			debug.set("shoot command", "linear")
		else
			--shorten distance because ball will bounce
			self._robot:chip(dist*0.62)
			debug.set("shoot command", "chip")
		end
		self:_doForceShoot()
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
			minDist = 0.075
		elseif self._movingBallHysteresis or World.RefereeState == "Game" then
			-- don't keep any distance to a moving ball
			minDist = 0
		else
			-- don't push the ball until the robot is correctly oriented
			minDist = STOPPED_BALL_DIST
		end

		local distError = minDist - distToBall.x
		if distError > 0 then
			-- too near
			speed = speed - Vector.fromAngle(targetDir):setLength(distError * 20)
		else
			-- get as near to the ball as allowed
			speed = speed - Vector.fromAngle(targetDir):setLength(distError * 5)
		end

		debug.set("shoot command", "none")
	end

	self._robot.trajectory:update(TrajectoryDirect, speed, targetDir, nil, accel)
end

function Shoot:_resetShoot()
	self._shootHysteresis = false
	self._travelStart = nil
	self._travelLimit = false
	self._canShootHysteresis = false
	self._sideOffsetErrorSum = 0
end


return Shoot
