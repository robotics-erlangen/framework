local PassReceiver = (require "../base/class").new("Task.PassReceiver", require "task/catchball")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Rating = require "util/rating"
local vis = require "../base/vis"
local Settings = require "settings"
local debug = require "../base/debug"

PassReceiver.priority = 5

function PassReceiver:_init()
	self.moveTo = nil
end

function PassReceiver:_rate(priorityMessages, notifications)
	-- catch ball
	-- block balls by moving in their way
	self.moveTo = self._robot.pos:nearestPosOnLine(World.Ball.pos, World.Ball.pos+(World.Ball.speed * 30))

	return Rating.posToRating(self._robot, self.moveTo)
end

function PassReceiver:_run()
	if World.Ball.speed:length() < Settings.fastBall then
		local tPos = tPos or World.Ball.pos
		debug.set("ChatchBallTargetPos", tPos)
		self._robot:setDribblerSpeed(1)
		self:_catchBall(tPos, 0.2, false)
	else
		vis.addCircle("ReceivePassMoveTo", self.moveTo, 0.03, vis.colors.blue, true)
		self._robot.path:setDefaultObstacles(self._robot, true)
		
		self._robot.path:addRobotObstacles(self._robot)
		local faceBall = (World.Ball.pos-self._robot.pos):angle()
		self._robot.trajectory:update(ToTarget, self.moveTo, faceBall)
		return { targetPos = self.moveTo }
	end
end

function PassReceiver.factory(position)
	local f = function (robots)
		return PassReceiver.create(robots[position])
	end
	return f
end

function PassReceiver.test(id)
	if id > 0 then
		return nil
	end
	return PassReceiver.factory(1), 1
end

return PassReceiver
