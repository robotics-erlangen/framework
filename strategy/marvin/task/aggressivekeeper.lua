local AggressiveKeeper = (require "../base/class").new("Task.AggressiveKeeper", require "task/base")

local World = require "../base/world"
local Ball = require "observer/ball"
local ToTarget = require "trajectory/totarget"

AggressiveKeeper.priority = 6

function AggressiveKeeper:_init()
end

function AggressiveKeeper:_run() 
	local tpos, ttime = Ball.toBall(self._robot, World.Ball)
	
	local fromGoal = (tpos - World.Geometry.FriendlyGoal):angle()

	self._robot:chip(1)
	self._robot.path:setDefaultObstacles(self._robot, true)
	self._robot.trajectory:update(ToTarget, tpos, fromGoal, nil, 1) --FIXME magic constant for end speed: 1m/s
	
	self._send("all").aggressiveKeeperPos(tpos)
end

function AggressiveKeeper:_rate()
	return self._robot == World.FriendlyKeeper and 1 or 0
end

function AggressiveKeeper.factory(position)
	local f = function (robots)
		return AggressiveKeeper.create(robots[position])
	end
	return f
end

function AggressiveKeeper.test(id)
	if id > 0 then
		return nil
	end
	return AggressiveKeeper.factory(1), 1
end

return AggressiveKeeper
