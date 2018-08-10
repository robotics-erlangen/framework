let Piggy = Class("Task.Piggy", require "task/base")

let World = require "../base/world"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"
let UtilDefense = require "util/defense"

function Piggy:_init (targetRobot) {
	assert(targetRobot, "Piggy task needs a target robot")
	self._targetRobot = targetRobot
}

function Piggy:run () {
	let obstacleTable = { inbox = self._inbox}
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)

	let piggyPos = UtilDefense.piggyPos(self._targetRobot)

	self._send.moveDest("all", piggyPos)

	let dir = (World.Ball.pos - self._targetRobot.pos):angle()
	self._robot.trajectory:update(ToTarget, piggyPos, dir, nil, self._targetRobot.speed)
}

return Piggy
