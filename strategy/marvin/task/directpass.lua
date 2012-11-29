local DirectPass = (require "../base/class").new("Task.DirectPass", require "task/movetoball")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"

DirectPass.priority = 4

function DirectPass:_init(targetRobot, linearShoot)
	self._targetRobot = targetRobot
	self._linearShoot = linearShoot
end

function DirectPass:_run()

	-- self.movetoball

	-- check for obstacles

	-- calculate best shooting speed

	-- shoot
		
end

return DirectPass
