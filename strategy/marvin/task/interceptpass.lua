local InterceptPass = Class("Task.InterceptPass", require "task/base")

local Cache = require "../base/cache"
local debug = require "../base/debug"
local vis = require "../base/vis"
local World = require "../base/world"
local Goal = require "observer/goal"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local Defense = require "util/defense"


function InterceptPass:_init()
end

function InterceptPass.calculateMoveDest(robot)
	local interceptionTime = Robot.minTimeToBall(robot)
	local interceptionBall = Physics.ballAtTime(World.Ball, interceptionTime)

	local interceptionAngle = (interceptionBall.pos - robot.pos):
		absoluteAngleDiff(World.Ball.speed)

	-- add some extra time if the ball rolls towards the robot
	local maxExtraTime = 0.1
	local extraTimeTransitionStart = 70 * math.pi / 180
	local extraTimeTransitionEnd = 110 * math.pi / 180

	local moveDest
	if interceptionAngle > extraTimeTransitionEnd then
		moveDest = Physics.ballAtTime(World.Ball, interceptionTime + maxExtraTime).pos
	elseif interceptionAngle > extraTimeTransitionStart then
		local extraTime = (interceptionAngle - extraTimeTransitionStart) /
			(extraTimeTransitionEnd - extraTimeTransitionStart) * maxExtraTime
		moveDest = Physics.ballAtTime(World.Ball, interceptionTime + extraTime).pos
	else
		moveDest = interceptionBall.pos
	end

	return moveDest, interceptionTime
end
InterceptPass.calculateMoveDest = Cache.forFrame(InterceptPass.calculateMoveDest)


function InterceptPass:run()
	local moveDest = self.calculateMoveDest(self._robot)

	PathHelper.setDefaultObstacles(self._robot.path, self._robot, true) -- ignore ball
	PathHelper.addRobotObstacles(self._robot.path, self._robot, false, true) -- ignore opponents

	local dir = (-World.Ball.speed):angle()
	local endSpeed = (World.Ball.pos - self._robot.pos):setLength(2)
	self._robot.trajectory:update(ToTarget, moveDest, dir, nil, endSpeed)
end

return InterceptPass
