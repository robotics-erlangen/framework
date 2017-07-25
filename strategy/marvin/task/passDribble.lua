local CatchBall = require "task/ability/catchball"
local PassDribble = Class("Task.PassDribble", require "task/base", CatchBall)


function PassDribble:_init(targetRobot)
	self._targetRobot = targetRobot
end

function PassDribble:run()

	self._robot:setDribblerSpeed(1)
	self:_catchBall(self._targetRobot.pos, 0, nil)
end

return PassDribble
