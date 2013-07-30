local MoveToStaticBall = (require "../base/class").new("Task.MoveToStaticBall", require "task/catchball")

local World = require "../base/world"

MoveToStaticBall.priority = 4

function MoveToStaticBall:_init(targetPos)
	self._targetPos = targetPos
end

function MoveToStaticBall:_canShoot()
	return true
end

function MoveToStaticBall:_run()
	-- limit movement speed to 1 m/s
	-- keep a little distance to the ball to avoid pushing it
	self:_catchBall(self._targetPos, 0, Settings.staticBallDistance, 1)
end

function MoveToStaticBall:_rate()
	return 1
end

function MoveToStaticBall.factory(position)
	return function (robots) return MoveToStaticBall.create(robots[position]) end
end

function MoveToStaticBall.test(id)
	if id > 0 then
		return nil
	end
	return MoveToStaticBall.factory(1), 1
end

return MoveToStaticBall
