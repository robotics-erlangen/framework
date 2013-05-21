local ReceivePass = (require "../base/class").new("Task.ReceivePass", require "task/base")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Observer = require "observer/ball"
local geom = require "../base/geom"
local Rating = require "util/rating"
local vis = require "../base/vis"

ReceivePass.priority = 5

function ReceivePass:_init()
end

function ReceivePass:_run(priorityMessages, notifications)
	self._robot.path:setDefaultObstacles(self._robot, true)
	self._robot.path:addRobotObstacles(self._robot)
	
	local faceBall = (World.Ball.pos-self.moveTo):angle()
	self._robot.trajectory:update(ToTarget, self.moveTo, faceBall)
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

function ReceivePass:_rate()
	local ballSpeed = World.Ball.speed:length()
	-- catch fast balls by blocking their path
	if ballSpeed > Settings.slowBall then
		self.moveTo = self._robot.pos:nearestPosOnLine(World.Ball.pos, World.Ball.pos+(World.Ball.speed * 30))
	else
		-- don't hunt slow balls, that's the job of someone else
		--TODO move to a good position 
		self.moveTo = self._robot.pos
	end
	
	vis.addCircle("RecivePassMoveTo", self.moveTo, 0.03, blue, true)
	
	return Rating.posToRating(self._robot, self.moveTo)
end

return ReceivePass
