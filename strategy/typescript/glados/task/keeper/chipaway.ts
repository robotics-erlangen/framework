let Shoot = require "task/ability/shoot"
let ChipAway = Class("Task.ChipAway", require "task/base", Shoot)
let World = require "../base/world"
let vis = require "../base/vis"

let PathHelper = require "trajectory/pathhelper"

let obstacleTable = {
    ignorePass = true
}

function ChipAway:_init () {
}

function ChipAway:run () {
    PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	// chip to opponent's defense line, so that the ball would roll into the goal's center
	let oppGoal = World.Geometry.OpponentGoal
	let chipPos = oppGoal + (self._robot.pos - oppGoal):setLength(World.Geometry.DefenseRadius)
	self:_chipToPos(chipPos)
	vis.addCircle("t/chipaway: target", chipPos, 0.05, vis.colors.orangeHalf, true)
}

return ChipAway
