local ShootSpeedTest = (require "../base/class").new("Task.ShootSpeedTest", require "task/base")
local World = require "../base/world"
local ToTarget = require "trajectory/totarget"

ShootSpeedTest.priority = 5 -- no meaning

function ShootSpeedTest:_init(speed)
	self._shootSpeed = speed
	self._ballInHalf = self._robot.pos.y * World.Ball.pos.y > 0
end

function ShootSpeedTest:run()
	local ballInHalf = self._robot.pos.y * World.Ball.pos.y > 0
	if ballInHalf ~= self._ballInHalf then
		log(World.Ball.speed)
		log(World.Ball.speed:length())
		self._ballInHalf = ballInHalf
	end

	self._robot:shoot(self._shootSpeed, math.abs(self._robot.pos.y))
	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.trajectory:update(ToTarget, self._robot.pos, self._robot.pos.y < 0 and math.pi/2 or -math.pi/2)
end

return ShootSpeedTest
