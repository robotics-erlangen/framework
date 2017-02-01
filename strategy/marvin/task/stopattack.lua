local StopAttack = Class("Task.StopAttack", require "task/base")

local Constants = require "../base/constants"
local Field = require "../base/field"
local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


local POSITION_PADDING = 0.02 -- safety distance

function StopAttack:_init()
	self._focusPoint = Vector(0, -World.Geometry.FieldHeightHalf + 4 * self._robot.radius)
	self._side = World.Ball.pos.x < 0 and "left" or "right"
end

function StopAttack:run()
	local stopRadius = Constants.stopBallDistance + self._robot.radius + POSITION_PADDING
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
	end
	if self._side == "left" and World.Ball.pos.x < -0.3 then
		self._side = "right"
	elseif self._side == "right" and World.Ball.pos.x > 0.3 then
		self._side = "left"
	end

	PathHelper.setDefaultObstacles(self._robot.path, self._robot, false, false, false, nil)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)

	if World.RefereeState == "DirectDefensive" or World.RefereeState == "IndirectDefensive" then
		self._robot:setDribblerSpeed(0.15)
	end

	self._robot.trajectory:update(ToTarget, pos, (World.Ball.pos - pos):angle())
end

return StopAttack
