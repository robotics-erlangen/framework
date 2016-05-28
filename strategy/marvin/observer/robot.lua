local Robot = {}

local Constants = require "../base/constants"
local debug = require "../base/debug"
local Field = require "../base/field"
local Referee = require "../base/referee"
local World = require "../base/world"
local Messaging = require "control/messaging"
local Physics = require "observer/physics"


--- checks if the ball can be shot directly to another robot
-- @param target, robot - robot to which the ball corridor is being tested
-- @param shooter, robot
-- @param chipkick, bool - do not consider robots as obstacle which can be chipped over
-- @return bool - true if way is free, false otherwise
function Robot.wayToRobotFree(target, shooter, chipkick)
	return Robot.wayToPosFree(target.pos, shooter, target, chipkick)
end

local oppChipDist = 0.2 -- min distance of opponent for chipping
local recvChipDist = 0.3 -- min distance for receiving a chip pass
function Robot.wayToPosFree(pos, ignoreRobot1, ignoreRobot2, chipkick)
	-- TODO consider speed of robots to look a little into the future
	for _, robot in ipairs(World.Robots) do
		if robot ~= ignoreRobot1 and robot ~= ignoreRobot2 then
			local _, distToBallCorridor = robot.pos:orthogonalProjection(World.Ball.pos, pos)
			local targetDist = World.Ball.pos:distanceTo(pos)
			local isInTheWay = math.abs(distToBallCorridor) < (robot.radius + World.Ball.radius)
				and robot.pos:distanceTo(World.Ball.pos) < targetDist
				and robot.pos:distanceTo(pos) < targetDist
			if chipkick then
				local shootBallPos = World.Ball.pos
				for _, pos in pairs(Messaging.get("attackPosition")) do
					shootBallPos = pos
				end
				isInTheWay = isInTheWay and
					(robot.pos:distanceTo(shootBallPos) > oppChipDist
					-- assuming ignoreRobot1 is the pass target
					or (ignoreRobot1 and ignoreRobot1.pos:distanceTo(robot.pos) > recvChipDist))
			end
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

local fastestOpponentAtBallLastRobot
local fastestOpponentAtBallLastTime
local fastestOpponentAtBallLastRun = 0
function Robot.fastestOpponentAtBall()
	if World.Time == fastestOpponentAtBallLastRun then
		return fastestOpponentAtBallLastRobot, fastestOpponentAtBallLastTime
	end

	local fastestOpponent = nil
	local fastestOpponentTime = math.huge
	for _,r in ipairs(World.OpponentRobots) do
		local oppTime = Robot.minTimeToBall(r)
		if oppTime < fastestOpponentTime then
			fastestOpponentTime = oppTime
			fastestOpponent = r
		end
	end

	fastestOpponentAtBallLastRobot = fastestOpponent
	fastestOpponentAtBallLastTime = fastestOpponentTime
	fastestOpponentAtBallLastRun = World.Time

	return fastestOpponent, fastestOpponentTime
end

local freekickShooterRobot = nil
function Robot._updateOwnFreekickShooter()
	if Referee.isFriendlyFreeKickState() then
		if not freekickShooterRobot or not Robot.hadBall(freekickShooterRobot, 0) then
			for _, robot in ipairs(World.FriendlyRobots) do
				if Robot.hadBall(robot, 0) then
					freekickShooterRobot = robot
					break
				end
			end
		end
	elseif World.RefereeState == "Game" and freekickShooterRobot then
		-- reset when any other robot touches the ball
		for _, robot in ipairs(World.Robots) do
			if robot ~= freekickShooterRobot
					and robot.pos:distanceTo(World.Ball.pos) < robot.radius + World.Ball.radius + 0.01 then
				freekickShooterRobot = nil
			end
		end
	else
		-- reset in any other states
		freekickShooterRobot = nil
	end
end

function Robot.ownFreeKickShooter()
	return freekickShooterRobot
end

return Robot
