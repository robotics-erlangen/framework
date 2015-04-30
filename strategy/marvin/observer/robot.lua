local Robot = {}
local World = require "../base/world"
local Constants = require "../base/constants"
local Messaging = require "control/messaging"



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
	for _, robot in pairs(World.Robots) do
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


local lastSpeed = {}
local speedSmoothed = {}
local accelerationSmoothed = {}
local alpha = 0.1
function Robot.estimateOpponentDynamics()
	for _, robot in pairs(World.OpponentRobots) do
		if lastSpeed[robot] then
			local accel = (robot.speed - lastSpeed[robot]) / World.TimeDiff -- classic derivative without smoothing
			accelerationSmoothed[robot] = alpha * accel:length() + (1 - alpha) * (accelerationSmoothed[robot] or 0) -- smoothed acceleration curve
		end
		speedSmoothed[robot] = alpha * robot.speed:length() + (1 - alpha) * (speedSmoothed[robot] or 0)
		lastSpeed[robot] = robot.speed

		if accelerationSmoothed[robot] and robot.maxAcceleration < accelerationSmoothed[robot] then
			robot.maxAcceleration = accelerationSmoothed[robot]
		end
		if robot.maxSpeed < speedSmoothed[robot] then
			robot.maxSpeed = speedSmoothed[robot]
		end
	end
end

local hadBallTimes = {}
function Robot.hadBall(robot, time)
	return hadBallTimes[robot] and World.Time - hadBallTimes[robot] <= time
end

function Robot._updateHadBall()
	for _,r in pairs(World.Robots) do
		if r:hasBall(World.Ball) then
			hadBallTimes[r] = World.Time
		end
	end
end

return Robot