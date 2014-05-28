local ReceiveBall = (require "../base/class").new("Task.ReceiveBall", require "task/catchball")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Ball = require "observer/ball"
local Robot = require "observer/robot"
local vis = require "../base/vis"
local debug = require "../base/debug"

ReceiveBall.priority = 5

function ReceiveBall:_init()
end

function ReceiveBall:run()
	local perpPos = self._robot.pos:nearestPosOnLine(World.Ball.pos, World.Ball.pos+(World.Ball.speed * 30))
	local moveTime = Robot.sidewardsTime(self._robot, World.Ball)
	local ballTime = Ball.ballRollTime(World.Ball.speed:length(), (perpPos-World.Ball.pos):length())
	local perpenticularSuccesfull = (moveTime and ballRollTime) and moveTime < ballRollTime or false
	
	-- block balls by moving in their way
	if World.Ball.speed:length() < Settings.fastBall or perpenticularSuccesfull then
		self._robot.path:setDefaultObstacles(self._robot, true)	
		self._robot.path:addRobotObstacles(self._robot)
		local faceBall = (World.Ball.pos-self._robot.pos):angle()
		self._robot.trajectory:update(ToTarget, perpPos, faceBall)
		self._send("all").moveDest(perpPos)
	else
		self:_catchBall(World.Ball.pos)
	end
end

return ReceiveBall
