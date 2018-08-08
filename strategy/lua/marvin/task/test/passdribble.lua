local CatchBall = require "task/ability/catchball"
local PassDribble = Class("Task.PassDribble", require "task/base", CatchBall)

local PathHelper = require "trajectory/pathhelper"

local obstacleTable = {
    ignorePass = true
}

function PassDribble:_init(targetRobot)
	self._targetRobot = targetRobot
end

function PassDribble:run()
    PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot:setDribblerSpeed(1)
	self:_catchBall(self._targetRobot.pos, 0, nil)
end

return PassDribble
