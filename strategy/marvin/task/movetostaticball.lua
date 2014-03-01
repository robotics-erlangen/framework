local MoveToStaticBall = (require "../base/class").new("Task.MoveToStaticBall", require "task/catchball")

local World = require "../base/world"

MoveToStaticBall.priority = 4

function MoveToStaticBall:_init(targetPos)
	self._targetPos = targetPos
end

function MoveToStaticBall:_canShoot()
	return true
end

function MoveToStaticBall:run()
	-- limit movement speed to 1 m/s
	-- keep a little distance to the ball to avoid pushing it
	self:_catchBall(self._targetPos, Settings.staticBallDistance, 1)
end

return MoveToStaticBall
