local Shoot = require "task/ability/shoot"
local ChipAway = Class("Task.ChipAway", require "task/base", Shoot)
local World = require "../base/world"
local vis = require "../base/vis"

function ChipAway:_init()
end

function ChipAway:run()
	-- chip to opponent's defense line, so that the ball would roll into the goal's center
	local oppGoal = World.Geometry.OpponentGoal
	local chipPos = oppGoal + (self._robot.pos - oppGoal):setLength(World.Geometry.DefenseRadius)
	self:_shoot(chipPos, math.huge, false, 3 * math.pi/180)
	vis.addCircle("t/chipaway: target", chipPos, 0.05, vis.colors.orangeHalf, true)
end

return ChipAway
