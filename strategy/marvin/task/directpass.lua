local DirectPass = (require "../base/class").new("Task.DirectPass", require "task/shoot")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Settings = require "settings"
local Shoot = require "observer/shoot"


DirectPass.priority = 4

function DirectPass:_init(targetRobot, linearShoot)
	self._targetRobot = targetRobot
	self._linearShoot = linearShoot
	self._shootProbability = 0
end

function DirectPass:_run(priorityMessages, notifications)

	local msg = notifications[self._targetRobot]

	local targetPos = msg and msg.targetPos or self._targetRobot.pos
	local targetDir = msg and msg.targetDir or self._targetRobot.dir

	if self._robot:hasBall(World.Ball) then -- if we aready got the ball 
		local newShootProbability = Shoot.evaluateCorridor(self._targetRobot, 0)
		if newShootProbability > Settings.shootProbabilityThreshold
				or newShootProbability <= self._shootProbabilty then
			-- shoot
		else
			self._shootProbability = newShootProbabilty
		end 
	else -- catch the ball
		-- catch the ball (movetoball?)
	end
end

return DirectPass
