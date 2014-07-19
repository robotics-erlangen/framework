local InterceptPass = (require "../base/class").new("Task.InterceptPass", require "task/base")

local Ball = require "observer/ball"
local Robot = require "observer/robot"
local Goal = require "observer/goal"

local World = require "../base/world"
local vis = require "../base/vis"
local Cache = require "../base/cache"

local ToTarget = require "trajectory/totarget"

InterceptPass.priority = 3

function InterceptPass:_init()
end

function InterceptPass.touchBallPosition(robot, timelimit)
	local MAX_ITER = 10
	local MIN_TIMESTEP = 0.005
	local EXTRA_TIME = 0.1 -- to compensate the difference between timeToPos and the real robot time
	local TIME_LIMIT = timelimit or 1

	local t_ball = math.min(Ball.ballRollTime(World.Ball.speed:length(), 
			robot.pos:distanceTo(World.Ball.pos)), TIME_LIMIT)
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

		local pos_ball = Ball.ballAt(World.Ball, t_ball)
		local to_robot = robot.pos - pos_ball
		local unprojected_radius = math.min((robot.shootRadius + World.Ball.radius) /
				math.sin(to_robot:absoluteAngleDiff(World.Ball.speed)), to_robot:length())
		local pos_robot = pos_ball + to_robot:setLength(unprojected_radius)
		

		if Robot.timeToPos(robot, pos_robot) + EXTRA_TIME < t_ball then
			t_ball = t_ball - timestep
		else
			t_ball = t_ball + timestep
		end

		if t_ball >= TIME_LIMIT then
			return nil
		end

		timestep = 0.5 * timestep
		if timestep < MIN_TIMESTEP then
			break
		end
	end

	local ball_interception_pos = Ball.ballAt(World.Ball, t_ball)
	--vis.addCircle("InterceptPass/ball_pos", ball_interception_pos, World.Ball.radius, vis.colors.magenta, true)

	return ball_interception_pos, t_ball
end
InterceptPass.touchBallPosition = Cache.forFrame(InterceptPass.touchBallPosition)

function InterceptPass:run()
	local pos, time = InterceptPass.touchBallPosition(self._robot)
	if not pos then
		pos = World.Ball.pos
	end

	self._robot.path:setDefaultObstacles(self._robot, true) -- ignore ball
	self._robot.path:addRobotObstacles(self._robot, false, true) -- ignore opponents

	local dir = (World.Ball. pos - self._robot.pos):angle()
	local endSpeed = (World.Ball.pos - self._robot.pos):setLength(2.5)
	self._robot.trajectory:update(ToTarget, pos, dir, nil, endSpeed)
end

return InterceptPass