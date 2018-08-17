let Shoot = require "task/ability/shoot"
let ChipAway = Class("Task.ChipAway", require "task/base", Shoot)
import * as World from "base/world";
import * as vis from "base/vis";

import * as PathHelper from "glados/trajectory/pathhelper";

let obstacleTable = {
    ignorePass = true
}

function ChipAway:_init () {
}

function ChipAway:run () {
    PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)
	// chip to opponent's defense line, so that the ball would roll into the goal's center
	let oppGoal = World.Geometry.OpponentGoal
	let chipPos = oppGoal + (this._robot.pos - oppGoal).setLength(World.Geometry.DefenseRadius)
	this._chipToPos(chipPos)
	vis.addCircle("t/chipaway: target", chipPos, 0.05, vis.colors.orangeHalf, true)
}

return ChipAway
