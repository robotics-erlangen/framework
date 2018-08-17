let AbilityShoot = require "task/ability/shoot"
let ChipToPos = Class("Task.ChipToPos", require "task/base", AbilityShoot)

import * as PathHelper from "glados/trajectory/pathhelper";

function ChipToPos:_init (firstContactPos, targetTime, ballReceiptPos, precision) {
	this._firstContactPos = firstContactPos
	this._targetTime = targetTime
	this._ballReceiptPos = ballReceiptPos
	this._chipPrecision = precision
}

function ChipToPos:run () {
	let obstacleTable = {
		inbox = this._inbox
	}
	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)
	this._chipToPos(this._firstContactPos, this._targetTime, this._ballReceiptPos, this._chipPrecision)
}

return ChipToPos
