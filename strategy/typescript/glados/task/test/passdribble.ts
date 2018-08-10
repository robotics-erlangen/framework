let CatchBall = require "task/ability/catchball"
let PassDribble = Class("Task.PassDribble", require "task/base", CatchBall)

let PathHelper = require "trajectory/pathhelper"

let obstacleTable = {
    ignorePass = true
}

function PassDribble:_init (targetRobot) {
	self._targetRobot = targetRobot
}

function PassDribble:run () {
    PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot:setDribblerSpeed(1)
	self:_catchBall(self._targetRobot.pos, 0, nil)
}

return PassDribble
