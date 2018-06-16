local Robot = {}

local Cache = require "../base/cache"
local Constants = require "../base/constants"
local Field = require "../base/field"
local Referee = require "../base/referee"
local vis = require "../base/vis"
local World = require "../base/world"
local Physics = require "observer/physics"


local lastLocalSpeed = {}
local lastRotation = {}
local speedSmoothed = {}
local rotationSmoothed = {}
local rotationAcclerationSmoothed = {}
local accelerationSmoothed = {}
local alpha = 0.02
local function estimateOpponentDynamics()
	if World.TimeDiff < 0.001 then
		-- don't do anything if the timediff is far below the regular 10 ms
		return
	end

	local nullVector = Vector(0,0)
	local invTimeDiff = (1 / World.TimeDiff)
	local currentLocalSpeed = {}
	local currentRotation = {}

	for _, robot in ipairs(World.OpponentRobots) do
		local localRobotSpeed = robot.speed:copy():rotate(-robot.dir)
		localRobotSpeed.x = math.abs(localRobotSpeed.x)
		localRobotSpeed.y = math.abs(localRobotSpeed.y)
		local localRobotDir = math.abs(robot.angularSpeed)
		if lastLocalSpeed[robot] then
			local accel = (localRobotSpeed - lastLocalSpeed[robot]):scaleLength(invTimeDiff)  -- classic derivative without smoothing
			accelerationSmoothed[robot] = accel:scaleLength(alpha) + (accelerationSmoothed[robot] or nullVector) * (1 - alpha) -- smoothed acceleration curve
		end
		if lastRotation[robot] then
			local accel = (localRobotDir - lastRotation[robot]) * invTimeDiff
			rotationAcclerationSmoothed[robot] = accel * alpha + (rotationAcclerationSmoothed[robot] or 0) * (1 - alpha)
		end
		speedSmoothed[robot] = robot.speed:length() * alpha + (speedSmoothed[robot] or 0) * (1 - alpha)
		rotationSmoothed[robot] = localRobotDir * alpha + (rotationSmoothed[robot] or 0) * (1 - alpha)
		currentLocalSpeed[robot] = localRobotSpeed
		currentRotation[robot] = localRobotDir

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

	lastLocalSpeed = currentLocalSpeed
	lastRotation = currentRotation
end

local hadBallTimes = {}
local inverseHadBallTimes = {}

-- Robot.hadBall(self._robot, 0) is equivalent to self._robot:hasBall(World.Ball)
function Robot.hadBall(robot, time)
	return hadBallTimes[robot] and World.Time - hadBallTimes[robot] <= time
end

-- returns true if the robot has the ball for at least <time> seconds, continuously
function Robot.controlsBall(robot, time)
	return inverseHadBallTimes[robot] and World.Time - inverseHadBallTimes[robot] >= time
end

local function updateHadBall()
	for _,r in ipairs(World.Robots) do
		if r:hasBall(World.Ball) then
			hadBallTimes[r] = World.Time
			vis.addCircle("o/robot: hasBall", r.pos, 0.15,
				vis.fromRGBA(127, 191, 255, 63), true, true)
		else
			inverseHadBallTimes[r] = World.Time
		end
	end
end

local touchedByBall = {}
function Robot.touchedBall(robot, time)
	return touchedByBall[robot] and World.Time - touchedByBall[robot] <= time
end

local function updateTouchedBall()
	for _,r in ipairs(World.Robots) do
		local touchDist = World.Ball.radius + Constants.positionError + r.radius
		if r.pos:distanceToSq(World.Ball.pos) < touchDist * touchDist then
			touchedByBall[r] = World.Time
		end
	end
end


local minTimeToBall = {}
local oldMinTimeToBall = {}
local function resetMinTimeToBall()
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
local function updateOwnStandardShooter()
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

local function calculateWayForPosition(pos, goal, radius, friendly)
	if pos.y < -World.Geometry.FieldHeightHalf then
		if pos.x < 0 then
			return 0
		else
			return Field.maxWay(radius)
		end
	end
	local projectedPos = goal + (pos - goal) * 100
	local _, robotWay = Field.intersectRayDefenseArea(projectedPos, goal - projectedPos, radius, friendly)
	return robotWay
end

-- calculates the time a robot needs around the defense area
-- if robotway is set it has to be the way of the intersection of robot.pos with
-- the defense area in the direction of the goal with the given radius
-- this function does not make sense when either robot.pos or targetPos are far away from the defense area
-- either targetPos or targetWay is optional, but one of the two has to be given
-- endSpeed is a number
function Robot.timeAroundDefenseAreaByWay(robot, robotWay, targetPos, targetWay, radius, friendly, endSpeed)
	if not targetPos and not targetWay then
		error("target information have to be present")
	end
	local targetGoal = friendly and World.Geometry.FriendlyGoal or World.Geometry.OpponentGoal
	if not robotWay then
		robotWay = calculateWayForPosition(robot.pos, targetGoal, radius, friendly)
	end
	if not targetPos then
		targetPos = Field.defenseIntersectionByWay(targetWay, radius, friendly)
	elseif not targetWay then
		targetWay = calculateWayForPosition(targetPos, targetGoal, radius, friendly)
	end
	local drivePoints = Field.cornerPointsBetweenWays(robotWay, targetWay, radius, friendly)
	table.insert(drivePoints, 1, robot.pos)
	table.insert(drivePoints, targetPos)
	local totalTime = 0
	local fakeRobot = {speed = robot.speed, maxSpeed = robot.maxSpeed, acceleration = robot.acceleration}
	for i = 2, #drivePoints do
		fakeRobot.pos = drivePoints[i-1]
		local es = Vector(0, 0)
		if i == #drivePoints and endSpeed then
			es = Vector(endSpeed, 0)
		end
		totalTime = totalTime + Physics.robotTimeToPos(fakeRobot, drivePoints[i], es)
		fakeRobot.speed = Vector(0, 0)
	end
	return totalTime
end


function Robot.isPressed(robot, attackPos)
	local directionOffset = (World.Geometry.OpponentGoal - robot.pos):setLength(robot.shootRadius + World.Ball.radius)
	local ballPos = attackPos or robot.pos + directionOffset
	local blockPos = ballPos + directionOffset

	local radius = 2.5
	for _,opp in ipairs(World.OpponentRobots) do
		if opp.pos:distanceToSq(blockPos) < radius * radius then
			if Physics.robotTimeToPos(opp, blockPos, Vector(0, 0)) < 1 then
				return true
			end
		end
	end
	return false
end
Robot.isPressed = Cache.forFrame(Robot.isPressed)

function Robot._update()
	estimateOpponentDynamics()
	resetMinTimeToBall()
	updateHadBall()
	updateTouchedBall()
	updateOwnStandardShooter()
end

return Robot
