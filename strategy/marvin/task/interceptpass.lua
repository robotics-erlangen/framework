local InterceptPass = Class("Task.InterceptPass", require "task/base")

local Physics = require "observer/physics"
local Robot = require "observer/robot"
local Goal = require "observer/goal"
local World = require "../base/world"
local vis = require "../base/vis"
local debug = require "../base/debug"
local Defense = require "util/defense"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


function InterceptPass:_init()
end

function InterceptPass.touchBallPosition(robot)
	local MAX_ITER = 10
	local MIN_TIMESTEP = 0.005
	local EXTRA_TIME = 0.1 -- to compensate the difference between timeToPos and the real robot time

	local t_ball = math.min(Physics.ballRollTime(World.Ball, robot.pos:distanceTo(World.Ball.pos)), 2)
	local timestep = 0.5 * t_ball

	for i = 1, MAX_ITER do
		-- pos_ball ---X--->
		--         \   |
		--   unproj \  | robot.radius + Ball.radius
		--   radius  \ |
		--            \|
		--        pos_robot
		--              \
		--               \
		--                \
		--                 \
		--                  \
		--                   \
		--                    \
		--              current robot.pos

		-- pos_ball = Ball at Time = t
		-- pos_robot = Robot at Time = t
		-- X = Ball at Time = moment of collision > t

		local pos_ball = Physics.ballAtTime(World.Ball, t_ball).pos
		local to_robot = robot.pos - pos_ball
		local unprojected_radius = math.min((robot.shootRadius + World.Ball.radius) /
				math.sin(to_robot:absoluteAngleDiff(World.Ball.speed)), to_robot:length())
		local pos_robot = pos_ball + to_robot:setLength(unprojected_radius)


		local endSpeed = (pos_robot - robot.pos):setLength(robot.maxSpeed)
		if Physics.robotTimeToPos(robot, pos_robot, endSpeed) + EXTRA_TIME < t_ball then
			t_ball = t_ball - timestep
		else
			t_ball = t_ball + timestep
		end

		timestep = 0.5 * timestep
		if timestep < MIN_TIMESTEP then
			break
		end
	end

	local ball_interception_pos = Physics.ballAtTime(World.Ball, t_ball).pos
	vis.addCircle("t/interceptpass: interception pos", ball_interception_pos, 0.14, vis.colors.magentaHalf, true)

	return ball_interception_pos, t_ball
end

function InterceptPass:run()
	local pos, time = InterceptPass.touchBallPosition(self._robot)

	PathHelper.setDefaultObstacles(self._robot.path, self._robot, true) -- ignore ball
	PathHelper.addRobotObstacles(self._robot.path, self._robot, false, true) -- ignore opponents

	local dir = (-World.Ball.speed):angle()
	local endSpeed = (World.Ball.pos - self._robot.pos):setLength(2)
	self._robot.trajectory:update(ToTarget, pos, dir, nil, endSpeed)
end

return InterceptPass
