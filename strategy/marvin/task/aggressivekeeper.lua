local AggressiveKeeper = (require "../base/class").newTask("Task.AggressiveKeeper", require "task/base")

local World = require "../base/world"
local Ball = require "observer/ball"
local ToTarget = require "trajectory/totarget"

function AggressiveKeeper:run()
	local tpos, ttime = Ball.toBall(self._robot, World.Ball)

	local fromGoal = (tpos - World.Geometry.FriendlyGoal):angle()

	self._robot:setDribblerSpeed(1)
	self._robot:chip(1)
	self._robot.path:setDefaultObstacles(self._robot, true)
	self._robot.trajectory:update(ToTarget, tpos, fromGoal, nil, Vector.create(fromGoal))

	self._send.aggressiveKeeperPos("all", tpos)
end

return AggressiveKeeper
