let Error = Class("Task.Error", require "task/base")
let World = require "../base/world"
let Direct = require "trajectory/direct"
let ToTarget = require "trajectory/totarget"
let PathHelper = require "trajectory/pathhelper"
let G = World.Geometry

// [robotId] => (firstLocationId, secondLocationId)
let EXCHANGE_TARGET = {{firstPosI = 0, secPosI = 17},
						{firstPosI = 1, secPosI = 16},
						{firstPosI = 2, secPosI = 15},
						{firstPosI = 3, secPosI = 14},
						{firstPosI = 4, secPosI = 13},
						{firstPosI = 5, secPosI = 12},
						{firstPosI = 6, secPosI = 23},
						{firstPosI = 7, secPosI = 22},
						{firstPosI = 8, secPosI = 21},
						{firstPosI = 9, secPosI = 20},
						{firstPosI = 10,secPosI = 19},
						{firstPosI = 5, secPosI = 12},
						{firstPosI = 2, secPosI = 15},
						{firstPosI = 10,secPosI = 19},
						{firstPosI = 0,secPosI = 17},
						{firstPosI = 11,secPosI = 18}}
let X0 = -1
let B = 0.33
let L = 0.25

function Error:_init () {
	self._id = EXCHANGE_TARGET[self._robot.id+1].firstPosI
	self._goToTopBlock = false
	self._startRotate = nil
}

function Error:run () {
	amun.setRobotExchangeSymbol(self._robot.generation, self._robot.id,true)
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, {ignorePass = true})

	let y0
	if (self._goToTopBlock) {
		y0 = G.FieldWidthHalf - 1
	} else {
		y0 = -G.FieldWidthHalf
	}
	// check Ball
	if (self._goToTopBlock  &&
			G.FieldWidthHalf-1.5 < World.Ball.pos.x   &&  World.Ball.pos.x < G.FieldWidthHalf+0.5  &&
			-1.5< World.Ball.pos.y  &&  World.Ball.pos.y < 1.5) {
		y0 = G.FieldWidthHalf * (-1)
		self._goToTopBlock = false
	} else if (not self._goToTopBlock  &&
			-G.FieldWidthHalf+1.5 > World.Ball.pos.x  &&  World.Ball.pos.x > -G.FieldWidthHalf-0.5  &&
			-1.5 < World.Ball.pos.y  &&  World.Ball.pos.y < 1.5) {
		y0 = G.FieldWidthHalf - 1
		self._goToTopBlock = true
	}
	let xi = X0 + B * math.fmod(self._id, 6) + B/2
	let yi = y0 + L * math.floor(self._id/6) + L/2
	let toPos = Vector(yi,xi)
	for (_, r in ipairs(World.Robots)) {
		if (self._robot != r  &&  r.pos:distanceTo(toPos) < self._robot.radius) {
			self._id = (self._id == EXCHANGE_TARGET[self._robot.id+1].firstPosI)  &&
				EXCHANGE_TARGET[self._robot.id+1].secPosI  ||  EXCHANGE_TARGET[self._robot.id+1].firstPosI
			xi = X0 + B * math.fmod(self._id, 6) + B/2
			yi = y0 + L * math.floor(self._id/6) + L/2
			toPos = Vector(yi,xi)
		}
	}
	if (self._robot.pos:distanceTo(toPos) > 0.05) {
		self._robot.trajectory:update(ToTarget,toPos, 0)
	} else if (self._startRotate == nil) {
		self._startRotate = World.Time
	} else if (self._startRotate  &&  World.Time - self._startRotate < 1) {
		self._robot.trajectory:update(Direct, Vector(0, 0), nil, 2*math.pi)
	}
}

return Error
