local ShootDirect = (require "../base/class").new("Task.ShootDirect", require "task/base")

ShootDirect.priority = 5

function ShootDirect:_init(dir, speed)
	self._dir = dir
	self._speed = speed
end

function ShootDirect:_run()
	self._robot:shootLinear(speed/self._robot.maxShotLinear)
end

return ShootDirect
