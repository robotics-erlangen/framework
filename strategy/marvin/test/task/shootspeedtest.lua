local ShootSpeedTest = Class("Task.ShootSpeedTest", require "task/base")
local World = require "../base/world"
local ToTarget = require "trajectory/totarget"

ShootSpeedTest.priority = 5 -- no meaning

function ShootSpeedTest:_init(speed)
	self._shootSpeed = speed
	self._ballInHalf = self._robot.pos.y * World.Ball.pos.y > 0
end

function ShootSpeedTest:run()
	local ballInHalf = self._robot.pos.y * World.Ball.pos.y > 0
	local shootDistance = math.max(0, math.abs(self._robot.pos.y) - self._robot.shootRadius - World.Ball.radius)
	if not ballInHalf and self._ballInHalf then
		log("Ball speed:  Look at the raw values in the plotter")
		log("Shoot speed: " .. tostring(self._robot:calculateShootSpeed(self._shootSpeed, math.abs(self._robot.pos.y))))
		log("Distance:    " .. tostring(shootDistance))
	end
	self._ballInHalf = ballInHalf

	local shootSpeed = self._robot:calculateShootSpeed(self._shootSpeed, shootDistance)
	self._robot:shoot(shootSpeed)
	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.trajectory:update(ToTarget, self._robot.pos, self._robot.pos.y < 0 and math.pi/2 or -math.pi/2)
end

return ShootSpeedTest
