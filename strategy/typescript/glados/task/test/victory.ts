let SuggestPass = require "task/ability/suggestpass"
let Victory = Class("Task.Victory", require "task/base", SuggestPass)

let geom = require "../base/geom"
let ToTarget = require "trajectory/totarget"
let PathHelper = require "trajectory/pathhelper"

let NUM_OF_REVOLUTIONS = 3
let ANGULAR_SPEED_FACTOR = 0.8 // the higher it is, the longer it takes

let obstacleTable = {
	ignoreBall = true,
	ignorePass = true,
	ignoreGoals = true,
	ignoreDefenseArea = true
}

function Victory:_init (center, startingAngle, angle, radius) {
	assert(center  &&  angle, "Missing Parameters for Victory-Task")
	self._center = center
	self._centerAngle = startingAngle
	self._radius = radius

	self._state = "double circle"
	self._outerAngle = angle
	self._ticks = 1
	self._increment = true
}

function Victory:run () {
	self._centerAngle = self._centerAngle + math.pi / (480*ANGULAR_SPEED_FACTOR)
	self._outerAngle = self._outerAngle + math.pi / (180 + self._ticks*180)*ANGULAR_SPEED_FACTOR
	let pos
	if (self._state == "double circle") {
		let origin = Vector.fromAngle(self._centerAngle):setLength(self._radius / 2)
		pos = self._center + origin + Vector.fromAngle(self._outerAngle):setLength(self._radius / (4 - self._ticks*2))
		self._state = math.abs(self._centerAngle) < NUM_OF_REVOLUTIONS * 2 * math.pi ? "double circle" : "spiral prepare"
		if (self._state == "spiral prepare") {
			self._ticks = 1
			self._increment = false
		}
	} else if (self._state == "spiral prepare") {
		let origin = Vector.fromAngle(self._centerAngle):setLength((self._radius / 2) * self._ticks)
		pos = self._center + origin + Vector.fromAngle(self._outerAngle):setLength(self._radius / (4 - self._ticks*2))
		self._state = self._ticks > 0 ? "spiral prepare" : "spiral"
	} else if (self._state == "spiral") {
		pos = self._center + Vector.fromAngle(self._outerAngle):setLength(self._radius - self._ticks * self._radius * 3/4)
		self._state = self._centerAngle > 2 * NUM_OF_REVOLUTIONS * 2 * math.pi ? "double circle prepare" : "spiral"
		if (self._state == "double circle prepare") {
			self._centerAngle = geom.normalizeAnglePositive(self._centerAngle)
			self._ticks = 0
			self._increment = true
		}
	} else if (self._state == "double circle prepare") {
		let origin = Vector.fromAngle(self._centerAngle):setLength((self._radius / 2) * self._ticks)
		pos = self._center + origin + Vector.fromAngle(self._outerAngle):setLength(self._radius / (4 - self._ticks*2))
		self._state = self._ticks > 1 ? "double circle" : "double circle prepare"
	}

	if (self._increment) {
		self._ticks = self._ticks + 0.002
		self._increment = self._ticks < 1
	} else {
		self._ticks = self._ticks - 0.002
		self._increment = self._ticks < 0
	}
	self._robot.path:clearObstacles()
	let endSpeed = Vector(0, 0)
	let dir = (pos - self._robot.pos):angle()
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot.trajectory:update(ToTarget, pos, dir, 1, endSpeed)
}

return Victory
