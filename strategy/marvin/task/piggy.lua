local Piggy = Class("Task.Piggy", require "task/base")

local Ball = require "observer/ball"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local World = require "../base/world"

function Piggy:_init(targetRobot)
	assert(targetRobot, "Piggy task needs a target robot")
	self._targetRobot = targetRobot
end

function Piggy:run()
	local obstacleTable = { inbox = self._inbox}
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)

	local x
	if self._targetRobot.pos.x > World.Ball.pos.x then
		x = -0.3
	else
		x = 0.3
	end

	local y
	if self._targetRobot.pos.y > World.Ball.pos.y then
		y = 0.2
	else
		y = -0.2
	end

	local offset = Vector(x, y)
	local piggyPos = self._targetRobot.pos + offset

	-- temporary, should be replaced with intercept pass ASAP
	if Ball.receivesPass(self._targetRobot) then
		piggyPos = self._robot.pos:nearestPosOnLine(self._targetRobot.pos, World.Ball.pos)
	end


	self._send.moveDest("all", piggyPos)

	local dir = (World.Ball.pos - self._targetRobot.pos):angle()
	self._robot.trajectory:update(ToTarget, piggyPos, dir, nil, self._targetRobot.speed)
end

return Piggy
