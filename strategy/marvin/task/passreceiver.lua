local PassReceiver = (require "../base/class").new("Task.PassReceiver", require "task/catchball")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local vis = require "../base/vis"
local Settings = require "settings"
local debug = require "../base/debug"
local vis = require "../base/vis"

PassReceiver.priority = 5

function PassReceiver:_init()
	self.moveTo = nil
end

function PassReceiver:run()
	-- catch ball
	-- block balls by moving in their way
	self.moveTo = self._robot.pos:nearestPosOnLine(World.Ball.pos, World.Ball.pos+(World.Ball.speed * 30))
	if World.Ball.speed:length() < Settings.fastBall then
		self.tPos = self.tPos or World.Ball.pos
		debug.set("CatchBallTargetPos", tPos)
		vis.addCircle("PassReceiverCatchBallTargetPos", self.tPos, 0.01)
		self._robot:setDribblerSpeed(1)
		-- just get the ball
		self:_catchBall(self.tPos, 0.2)
	else
		vis.addCircle("ReceivePassMoveTo", self.moveTo, 0.03, vis.colors.blue, true)
		self._robot.path:setDefaultObstacles(self._robot, true)
		
		self._robot.path:addRobotObstacles(self._robot)
		local faceBall = (World.Ball.pos-self._robot.pos):angle()
		self._robot.trajectory:update(ToTarget, self.moveTo, faceBall)
		self._send("all").moveDest(self.moveTo)
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
