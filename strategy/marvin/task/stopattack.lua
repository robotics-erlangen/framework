local StopAttack = (require "../base/class").new("Task.StopAttack", require "task/base")

local World = require "../base/world"
local Constants = require "../base/constants"
local Field = require "util/field"
local ToTarget = require "trajectory/totarget"

StopAttack.priority = 4

function StopAttack:_init()
	self._focusPoint = Vector.create(0, -World.Geometry.FieldHeightHalf + 4 * self._robot.radius)
	self._side = World.Ball.pos.x < 0 and "left" or "right"
end

function StopAttack:run()
	if self._side == "left" and World.Ball.pos.x > 0.3 then
		self._side = "right"
	elseif self._side == "right" and World.Ball.pos.x < -0.3 then
		self._side = "left"
	end

	local pos = World.Ball.pos + (self._focusPoint - World.Ball.pos):
			setLength(Constants.stopBallDistance + self._robot.radius + Settings.positionPadding)

	-- TODO 
	-- avoid crashing into the centerbacks using self._side as evasion direction
	-- probably by implementing Field.intersectCircleDefenseArea

	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)
	
	self._robot.trajectory:update(ToTarget, pos, (World.Ball.pos - pos):angle())
end

return StopAttack
