local ManMark = Class("Task.ManMark", require "task/base")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Defense = require "util/defense"

function ManMark:_init(targetRobot)
	assert(targetRobot, "ManMark task needs a target robot")
	self._targetRobot = targetRobot
end

function ManMark:run()
	local preferredPos = Defense.manMarkPos(self._targetRobot)
	local preferredDir = (World.Ball.pos - self._robot.pos):angle()

	-- If the opponent is driving in the opposite direction of me than change the pos into his movement
	local oppSpeed = self._targetRobot.speed:copy()
	if oppSpeed:length() > 1 and oppSpeed:absoluteAngleDiff(self._robot.speed) > math.pi / 2 then
		preferredPos = preferredPos + oppSpeed:setLength(oppSpeed:length()*0.6)
	end

	-- Quick fix to not interfere with goal shots
	local shooter, shootDest = next(self._inbox.shootDestination())
	if shootDest then
		self._robot.path:addLine(World.Ball.pos.x, World.Ball.pos.y, shootDest.x, shootDest.y, self._robot.radius)
	end

	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)
	self._robot.trajectory:update(ToTarget, preferredPos, preferredDir, nil, self._targetRobot.speed)
	self._send.moveDest("all", preferredPos)
end

return ManMark
