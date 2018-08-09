local Shoot = require "task/ability/shoot"
local ChipAway = Class("Task.ChipAway", require "task/base", Shoot)
local World = require "../base/world"
local vis = require "../base/vis"

local PathHelper = require "trajectory/pathhelper"

local obstacleTable = {
    ignorePass = true
}

function ChipAway:_init()
end

function ChipAway:run()
    PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	// chip to opponent's defense line, so that the ball would roll into the goal's center
	local oppGoal = World.Geometry.OpponentGoal
	local chipPos = oppGoal + (self._robot.pos - oppGoal):setLength(World.Geometry.DefenseRadius)
	self:_chipToPos(chipPos)
	vis.addCircle("t/chipaway: target", chipPos, 0.05, vis.colors.orangeHalf, true)
end

return ChipAway
