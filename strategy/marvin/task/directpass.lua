local DirectPass = (require "../base/class").new("Task.DirectPass", require "task/shoot")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Settings = require "settings"
local Shoot = require "observer/shoot"


DirectPass.priority = 4

function DirectPass:_init(targetRobot, linearShoot)
	self._targetRobot = targetRobot
	self._linearShoot = linearShoot
end

function DirectPass:_successProbability(t)
	-- FIXME check that robot is oriented towards the target

	--TODO check if other position would be more efficient
	if self._linearShoot then
		return Shoot.evaluatePassCorridor(self._targetRobot, t)	--check posibility of success at time t for linear shoot
	else
		return Shoot.evaluateChipCorridor(self._targetRobot, t)	--check posibility of success at time t for chip
	end
end

function DirectPass:_run(priorityMessages, notifications)
	local msg = notifications[self._targetRobot]

	local targetPos = msg and msg.targetPos or self._targetRobot.pos
	local targetDir = msg and msg.targetDir or self._targetRobot.dir

	-- TODO calc shoot target
	-- TODO get pass speed

	-- check for obstacles

	local passSpeed = 1
	self:_shoot(targetPos, passSpeed, self._linearShoot, Settings.shootProbabilityThreshold)
end

local inst = nil
function DirectPass.test()
	local robot1 = World.FriendlyRobots[1]
	local robot2 = World.FriendlyRobots[2]
	if robot1 and robot2 then
		inst = inst or DirectPass.create(robot1, robot2, true)
		return inst
	else
		inst = nil
	end
end

return DirectPass
