local AggressiveKeeper = (require "../base/class").new("Task.AggressiveKeeper", require "task/base")

local World = require "../base/world"
local Ball = require "observer/ball"
local ToTarget = require "trajectory/totarget"

AggressiveKeeper.priority = 6

function AggressiveKeeper:_init()
end

function AggressiveKeeper:run() 
	local tpos, ttime = Ball.toBall(self._robot, World.Ball)
	
	local fromGoal = (tpos - World.Geometry.FriendlyGoal):angle()

	self._robot:chip(1)
	self._robot.path:setDefaultObstacles(self._robot, true)
	self._robot.trajectory:update(ToTarget, tpos, fromGoal, nil, 1) --FIXME magic constant for end speed: 1m/s
	
	self._send("all").aggressiveKeeperPos(tpos)
end

return AggressiveKeeper
