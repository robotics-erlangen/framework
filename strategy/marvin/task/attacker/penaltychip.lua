local Shoot = require "task/ability/shoot"
local PenaltyChip = Class("Task.PenaltyChip", require "task/base", Shoot)
local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local Constants = require "../base/constants"
local ToTarget = require "trajectory/totarget"
local debug = require "../base/debug"

local G = World.Geometry

local chipGradient = 1
local g = 10
local robotHeight = Constants.maxRobotHeight
local robotRadius = Constants.maxRobotRadius

-- "y(t)=-g*t*t + chipGradient*t*v_x"
-- "t_ges = d / v_x"
-- "y(t)=-g*t*t + chipGradient*t/t_ges*d"
-- "t_ges = sqrt(chipGradient * d / g)"
-- "0 = -g*t*t + chipGradient * t * v_x - robotHeight"
-- "v_x = sqrt(g*d/chipGradient)"
-- "(chipGradient*v_x/2g) - sqrt((chipGradient * v_x /2g)^2 - robotHeight/g) = t_0"
-- "(sqrt(d*chipGradient) - sqrt(d*chipGradient - 4*robotHeight))/sqrt(g)/2 = t_0"



local function v_x(d)
	return math.sqrt(g*d/chipGradient)
end
local function t_ges(d)
	return d / v_x(d)
end
local function maxHeight(d)
	return (d*chipGradient)/4
end
local function t_0(d)
	return (math.sqrt(maxHeight(d)) - math.sqrt(maxHeight(d) - robotHeight)) / math.sqrt(g)
end
local function t_0Sq(d)
	return (2*(math.sqrt(maxHeight(d)-robotHeight)) -robotHeight)/g
end
local function t_1(d)
	return (math.sqrt(maxHeight(d)) + math.sqrt(maxHeight(d) - robotHeight)) / math.sqrt(g)
end
local function p_x_t0(d)
	return v_x(d)*t_0(d)
end

function PenaltyChip:_init(ball, mode)
	self._ball = ball
	self._mode = mode
end

local obstacleTable = {
	ignorePass = true,
	ignoreBall = true
}
local bufferTime = 0.05

--- Calculates the effective distance between ball and dribbler
-- find an ellipsis with the left and right dribbler edge points as focal points
-- dist is the length of the semi-minor axis
-- @param robot robot - the robot to calculate
-- @param ballPos vector - position of the ball
local function ellipticDistance(robot, ballPos)
	local dribblerPos = robot.pos + Vector.fromAngle(robot.dir):scaleLength(robot.shootRadius)
	local dribblerWidthHalf = Vector.fromAngle(robot.dir - math.pi/2):scaleLength(robot.dribblerWidth/2)
	local leftDribblerEdge = dribblerPos + dribblerWidthHalf
	local rightDribblerEdge = dribblerPos - dribblerWidthHalf
	return 0.5*math.sqrt((leftDribblerEdge:distanceTo(ballPos) + rightDribblerEdge:distanceTo(ballPos))^2 - robot.dribblerWidth*robot.dribblerWidth)
end

local function distanceMode(n, ball)
	local distance = ball.pos:distanceTo(G.OpponentGoal)
	if n == 1 then
		return math.min(distance - 0.05, 3)
	elseif n == 2 then
		return math.min(distance - 0.05, 3)/(1+Constants.floorDamping)
	else
		return math.min(distance /2 , 3)
	end
end

local function checkAngle(ball, robot)
	local toLeftPost = G.OpponentGoal - Vector(G.GoalWidth/2, 0) - robot.pos
	local toRightPost = G.OpponentGoal + Vector(G.GoalWidth/2, 0) - robot.pos
	if not Vector.fromAngle(robot.dir):insideSector(toRightPost, toLeftPost) then
		return "fail angle robot"
	end
	-- if not robot.speed:insideSector(toRightPost, toLeftPost) then
	-- 	return "fail angle robot speed"
	-- end
	if not ball.speed:insideSector(toRightPost, toLeftPost) then
		return "fail angle ball"
	end
end
local function checkBall(robot, ball)
	if ellipticDistance(robot, ball.pos) > ball.radius + 0.02 then
		return "fail has ball"
	end
end
local function checkBounces(distance, ball)
	local length2 = distance * Constants.floorDamping
	local remainingDist = ball.pos:distanceTo(G.OpponentGoal) - distance
	if remainingDist < length2 then
		if maxHeight(length2) > robotHeight and
				p_x_t0(length2) < remainingDist and
				length2 - p_x_t0(length2) > remainingDist then
			return "2nd bounce too high"
		end
	end
	local length3 = length2 * Constants.floorDamping
	remainingDist = remainingDist - length2
	if remainingDist < length3 then
		if maxHeight(length3) > robotHeight and
				p_x_t0(length3) < remainingDist and
				length3 - p_x_t0(length3) > remainingDist then
			return "3rd bounce too high"
		end
	end
end

local function checkShot(distance, robot, ball, keeper)
	local minDist = p_x_t0(distance)
	if (minDist + robotRadius) * 2 +  bufferTime * robot.speed:length() > distance then
		return "fail min distance"
	end
	local toGoal = (G.OpponentGoal - robot.pos):normalize()
	local bufferKeeper = keeper.pos + keeper.speed * bufferTime
	local bufferSelf = robot.pos + robot.speed * bufferTime
	local keeperOnLine = (bufferKeeper - bufferSelf):dot(toGoal)
	local t0 = t_0(distance)
	local t1 = t_ges(distance) - t0
	if keeperOnLine - robotRadius + keeper.speed:dot(toGoal) * t0 < minDist then
		return "fail keeper too close"
	end

	-- no robotRadius since it doesn't matter if the ball lands on the hull
	if keeperOnLine + keeper.acceleration.aBrakeFMax * t1*t1 + keeper.speed:dot(toGoal) * t1 > distance - minDist then
		return "fail keeper too far"
	end
	if bufferKeeper:distanceToLineSegment(ball.pos, G.OpponentGoal) > robotRadius + 0.06 then
		return "free shot"
	end
end

function PenaltyChip.check(ball, robot)
	local keeper = World.OpponentKeeper
	if not keeper then
		return false
	end
	local failed = checkAngle(ball, robot)
	if failed then
		debug.set("PenaltyChip", failed)
		return false
	end
	failed = checkBall(robot, ball)
	if failed then
		debug.set("PenaltyChip", failed)
		return false
	end
	local distance = distanceMode(1, ball)
	failed = checkShot(distance, robot, ball, keeper)
	if failed then
		debug.set("PenaltyChip1", failed)
		return false
	end
	failed = checkBounces(distance, ball)
	if failed then
		distance = distanceMode(2, ball)
		failed = checkShot(distance, robot, ball, keeper)
		if failed then
			debug.set("PenaltyChip2", failed)
			return false
		end
		failed = checkBounces(distance, ball)
		if failed then
			distance = distanceMode(3, ball)
			failed = checkShot(distance, robot, ball, keeper)
			if failed then
				debug.set("PenaltyChip3", failed)
				return false
			end
			failed = checkBounces(distance, ball)
			if failed then
				debug.set("PenaltyChip3", failed)
				return false
			end
			return 3
		end
		return 2
	end
	return 1
end

function PenaltyChip:run()
    PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	local shootlength = distanceMode(self._mode, self._ball)
	debug.set("chip distance", shootlength)
	self._robot:setDribblerSpeed(0.5)
	self._robot:chip(shootlength)
	self._robot.trajectory:update(ToTarget, G.OpponentGoal - Vector(0,G.DefenseHeight), (G.OpponentGoal - self._robot.pos):angle())
end

return PenaltyChip