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
	local stopRadius = Constants.stopBallDistance + self._robot.radius + Settings.positionPadding
	local pos = World.Ball.pos + (self._focusPoint - World.Ball.pos):setLength(stopRadius)

	local intersections = Field.intersectCircleDefenseArea(World.Ball.pos, 
			stopRadius, 4 * self._robot.radius, false)
	if #intersections > 0 then
		pos = nil
		for _,p in ipairs(intersections) do
			if not pos or (self._side == "left" and p.x < pos.x) or 
					(self._side == "right" and p.x > pos.x) then
				pos = p
			end
		end
	else
		if self._side == "left" and World.Ball.pos.x > 0.3 then
			self._side = "right"
		elseif self._side == "right" and World.Ball.pos.x < -0.3 then
			self._side = "left"
		end
	end

	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)
	
	self._robot.trajectory:update(ToTarget, pos, (World.Ball.pos - pos):angle())
end

return StopAttack
