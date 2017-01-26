local Robot = {}

local Cache = require "../base/cache"
local Constants = require "../base/constants"
local Referee = require "../base/referee"
local vis = require "../base/vis"
local World = require "../base/world"
local Physics = require "observer/physics"


--- checks if the ball can be shot directly to another robot
-- @param target, robot - robot to which the ball corridor is being tested
-- @param shooter, robot
-- @return bool - true if way is free, false otherwise
function Robot.wayToRobotFree(target, shooter)
	return Robot.wayToPosFree(target.pos, shooter, target)
end

function Robot.wayToPosFree(pos, ignoreRobot1, ignoreRobot2)
	-- TODO consider speed of robots to look a little into the future
	for _, robot in ipairs(World.Robots) do
		if robot ~= ignoreRobot1 and robot ~= ignoreRobot2 then
			local _, distToBallCorridor = robot.pos:orthogonalProjection(World.Ball.pos, pos)
			local targetDist = World.Ball.pos:distanceTo(pos)
			local isInTheWay = math.abs(distToBallCorridor) < (robot.radius + World.Ball.radius)
				and robot.pos:distanceTo(World.Ball.pos) < targetDist
				and robot.pos:distanceTo(pos) < targetDist
			if isInTheWay then
				return false
			end
		end
	end
	return true
end


local lastLocalSpeed = {}
local lastRotation = {}
local speedSmoothed = {}
local rotationSmoothed = {}
local rotationAcclerationSmoothed = {}
local accelerationSmoothed = {}
local alpha = 0.02
function Robot.estimateOpponentDynamics()
	local nullVector = Vector(0,0)
	for _, robot in ipairs(World.OpponentRobots) do
		local localRobotSpeed = robot.speed:copy():rotate(-robot.dir)
		localRobotSpeed.x = math.abs(localRobotSpeed.x)
		localRobotSpeed.y = math.abs(localRobotSpeed.y)
		local localRobotDir = math.abs(robot.angularSpeed)
		if lastLocalSpeed[robot] then
			local accel = (localRobotSpeed - lastLocalSpeed[robot]) / World.TimeDiff -- classic derivative without smoothing
			accelerationSmoothed[robot] = accel * alpha + (accelerationSmoothed[robot] or nullVector) * (1 - alpha) -- smoothed acceleration curve
		end
		if lastRotation[robot] then
			local accel = (localRobotDir - lastRotation[robot]) / World.TimeDiff
			rotationAcclerationSmoothed[robot] = accel * alpha + (rotationAcclerationSmoothed[robot] or 0) * (1 - alpha)
		end
		speedSmoothed[robot] = robot.speed:length() * alpha + (speedSmoothed[robot] or 0) * (1 - alpha)
		rotationSmoothed[robot] = localRobotDir * alpha + (rotationSmoothed[robot] or 0) * (1 - alpha)
		lastLocalSpeed[robot] = localRobotSpeed
		lastRotation[robot] = localRobotDir

		if accelerationSmoothed[robot] then
			local accel = accelerationSmoothed[robot]
			if accel.x > 0 and accel.x > robot.acceleration.aSpeedupFMax then
				robot.acceleration.aSpeedupFMax = accel.x
			end
			if accel.x < 0 and -accel.x > robot.acceleration.aBrakeFMax then
				robot.acceleration.aBrakeFMax = -accel.x
			end
			if accel.y > 0 and accel.y > robot.acceleration.aSpeedupSMax then
				robot.acceleration.aSpeedupSMax = accel.y
			end
			if accel.y < 0 and -accel.y > robot.acceleration.aBrakeSMax then
				robot.acceleration.aBrakeSMax = -accel.y
			end
		end
		if rotationAcclerationSmoothed[robot] then
			local rot = rotationAcclerationSmoothed[robot]
			if rot > 0 and rot > robot.acceleration.aSpeedupPhiMax then
				robot.acceleration.aSpeedupPhiMax = rot
			end
			if rot < 0 and -rot > robot.acceleration.aBrakePhiMax then
				robot.acceleration.aBrakePhiMax = -rot
			end
		end
		if robot.maxSpeed < speedSmoothed[robot] then
			robot.maxSpeed = speedSmoothed[robot]
		end
		if robot.maxAngularSpeed < rotationSmoothed[robot] then
			robot.maxAngularSpeed = rotationSmoothed[robot]
		end
	end
end

local hadBallTimes = {}
-- Robot.hadBall(self._robot, 0) is equivalent to self._robot:hasBall(World.Ball)
function Robot.hadBall(robot, time)
	return hadBallTimes[robot] and World.Time - hadBallTimes[robot] <= time
end

function Robot._updateHadBall()
	for _,r in ipairs(World.Robots) do
		if r:hasBall(World.Ball) then
			hadBallTimes[r] = World.Time
			vis.addCircle("o/robot: hasBall", r.pos, 0.15,
				vis.fromRGBA(127, 191, 255, 63), true, true)
		end
	end
end

local touchedByBall = {}
function Robot.touchedBall(robot, time)
	return touchedByBall[robot] and World.Time - touchedByBall[robot] <= time
end

function Robot._updateTouchedBall()
	for _,r in ipairs(World.Robots) do
		if r.pos:distanceTo(World.Ball.pos) < r.radius + World.Ball.radius + Constants.positionError then
			touchedByBall[r] = World.Time
		end
	end
end


local minTimeToBall = {}
local oldMinTimeToBall = {}
function Robot._resetMinTimeToBall()
	oldMinTimeToBall = minTimeToBall
	minTimeToBall = {}
end

function Robot.minTimeToBall(robot)
	if minTimeToBall[robot] then
		return minTimeToBall[robot]
	end

	local targetPos = robot.isFriendly and World.Geometry.OpponentGoal or World.Geometry.FriendlyGoal
	minTimeToBall[robot] = Physics.robotTimeToBall(robot, World.Ball, targetPos, robot.maxSpeed, oldMinTimeToBall[robot])
	return minTimeToBall[robot]
end

local previousMinShootTimes = {}
function Robot.minShootTime(robot, shootPos)
	local minDelay = 0.1
	local prevTime = previousMinShootTimes[robot]
	local time
	if Robot.hadBall(robot, 0) then
		time = minDelay
	else
		time = math.max(minDelay, Physics.robotTimeToBall(robot, World.Ball,
			shootPos, robot.maxSpeed, prevTime))
	end
	previousMinShootTimes[robot] = time
	return time
end
Robot.minShootTime = Cache.forFrame(Robot.minShootTime)

local standardShooterRobot = nil
function Robot._updateOwnStandardShooter()
	if Referee.isFriendlyFreeKickState() or World.RefereeState == "KickoffOffensive" then
		if not standardShooterRobot or not Robot.hadBall(standardShooterRobot, 0) then
			for _, robot in ipairs(World.FriendlyRobots) do
				if Robot.hadBall(robot, 0) then
					standardShooterRobot = robot
					break
				end
			end
		end
	elseif World.RefereeState == "Game" and standardShooterRobot then
		-- reset when any other robot touches the ball
		for _, robot in ipairs(World.Robots) do
			if robot ~= standardShooterRobot and Robot.touchedBall(robot, 0) then
				standardShooterRobot = nil
			end
		end
	else
		-- reset in any other states
		standardShooterRobot = nil
	end
end

function Robot.ownStandardShooter()
	if World.RefereeState == "Game" then
		return standardShooterRobot
	else
		return nil
	end
end

return Robot
