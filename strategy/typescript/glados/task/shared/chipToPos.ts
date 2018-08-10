let AbilityShoot = require "task/ability/shoot"
let ChipToPos = Class("Task.ChipToPos", require "task/base", AbilityShoot)

let PathHelper = require "trajectory/pathhelper"

function ChipToPos:_init (firstContactPos, targetTime, ballReceiptPos, precision) {
	self._firstContactPos = firstContactPos
	self._targetTime = targetTime
	self._ballReceiptPos = ballReceiptPos
	self._chipPrecision = precision
}

function ChipToPos:run () {
	let obstacleTable = {
		inbox = self._inbox
	}
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self:_chipToPos(self._firstContactPos, self._targetTime, self._ballReceiptPos, self._chipPrecision)
}

return ChipToPos
