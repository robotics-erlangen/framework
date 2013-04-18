local ReceivePass = (require "../base/class").new("Task.ReceivePass", require "task/base")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Observer = require "observer/ball"
local geom = require "../base/geom"

ReceivePass.priority = 5

function ReceivePass:_init()
end

function ReceivePass:_run(priorityMessages, notifications)
	self._robot.path:setDefaultObstacles(self._robot, true)
	self._robot.path:addRobotObstacles(self._robot)
	
	local ballSpeed = World.Ball.speed:length()
	-- bei schnellen Baellen in den Weg stellen und abfangen
	if ballSpeed > Settings.slowBall then
		local movTo = self._robot.pos:nearestPosOnLine(World.Ball.pos, World.Ball.pos+(World.Ball.speed * 30))
		local faceBall = (World.Ball.pos-movTo):angle()
		self._robot.trajectory:update(ToTarget, movTo, faceBall)
	--bei langsamen Baellen entgegenbewegen
	else
		local movTo = World.Ball.pos - (World.Ball.pos - self._robot.pos):setLength(self._robot.shootRadius)
		local faceBall = (World.Ball.pos-movTo):angle()
		self._robot.trajectory:update(ToTarget, movTo, faceBall)
	end
end

function ReceivePass.factory(position)
	local f = function (robots)
		return ReceivePass.create(robots[position])
	end
	return f
end

function ReceivePass.test(id)
	if id > 0 then
		return nil
	end
	return ReceivePass.factory(1), 1
end

return ReceivePass
