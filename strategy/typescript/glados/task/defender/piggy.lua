local Piggy = Class("Task.Piggy", require "task/base")

local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local UtilDefense = require "util/defense"

function Piggy:_init(targetRobot)
	assert(targetRobot, "Piggy task needs a target robot")
	self._targetRobot = targetRobot
end

function Piggy:run()
	local obstacleTable = { inbox = self._inbox}
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)

	local piggyPos = UtilDefense.piggyPos(self._targetRobot)

	self._send.moveDest("all", piggyPos)

	local dir = (World.Ball.pos - self._targetRobot.pos):angle()
	self._robot.trajectory:update(ToTarget, piggyPos, dir, nil, self._targetRobot.speed)
end

return Piggy
