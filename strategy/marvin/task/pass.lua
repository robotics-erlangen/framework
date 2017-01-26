local Shoot = require "task/ability/shoot"
local Pass = Class("Task.Pass", require "task/base", Shoot)

function Pass:_init(targetRobot, targetPos, chip, passSpeed)
	self._targetRobot = targetRobot
	self._targetPos = targetPos
	self._chip = chip
	self._passSpeed = passSpeed or self._targetRobot.constants.passSpeed
end

function Pass:run()
	self:_shoot(self._targetPos, self._passSpeed, not self._chip, 3 * math.pi/180, false)
end

return Pass
