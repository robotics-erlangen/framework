local Base = require "agent/base/behavior"
local Move = Class("Agent.Shared.RescueFromDefenseArea", Base)

local World = require "../base/world"
local MoveToPos = require "task/shared/movetopos"

local function calculateRescuePosition(robot)
	local x = math.sign(robot.pos.x) * (World.Geometry.DefenseStretchHalf + 0.2)
	local y = math.sign(robot.pos.y) * (World.Geometry.FieldHeightHalf + robot.radius + 0.02)
	return Vector(x, y)
end

function Move:check()
	return World.RefereeState ~= "BallPlacementOffensive" and math.abs(self._robot.pos.y) > World.Geometry.FieldHeightHalf and
		math.abs(self._robot.pos.x) + 0.1 < math.abs(calculateRescuePosition(self._robot).x)
end

function Move:_updateTask()
	return MoveToPos, {calculateRescuePosition(self._robot)}
end

return Move
