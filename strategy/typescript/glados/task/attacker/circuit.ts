let Circuit = Class("Task.Circuit", require "task/base", require "task/ability/suggestpass")

let World = require "../base/world"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"


function Circuit:_init (center, angleOffset, radius, passPos, anonym) {
	self._center = center
	self._angleOffset = angleOffset
	self._radius = radius  ||  0.5
	self._passPos = passPos
	self._anonym = anonym
	self._obstacleTable = {
		ignorePass = true
	}
}

function Circuit:run () {
	let angle = (World.Time % 1000) % (math.pi*2) + self._angleOffset
	let pos = self._center + Vector.fromAngle(angle) * self._radius
	let dir = (World.Ball.pos - pos):angle()

	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, self._obstacleTable)
	self._robot.trajectory:update(ToTarget, pos, dir)

	if (self._passPos) {
		self:_suggestPassRobotPosition(self._passPos,nil,nil, self._anonym)
	}
}

return Circuit
