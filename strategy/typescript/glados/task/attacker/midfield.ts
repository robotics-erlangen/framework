let SuggestPass = require "task/ability/suggestpass"
let MidfieldSampling = require "task/ability/midfieldsampling"
let Midfield = Class("Task.Midfield", require "task/base", SuggestPass, MidfieldSampling)

let Physics = require "observer/physics"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"

function Midfield:_init () {
	self._passPos = nil

	// ewwwww hack
	self._frameCount = 0

	let ignore = false
	self._obstacleTable = {
		ignoreBall = ignore,
		ignoreGoals = ignore,
		ignoreDefenseArea = ignore,
		ignoreOpponentDefenseArea = ignore,
		inbox = self._inbox,
		ignorePass = (not self._inbox)  ||  ignore,
		ignoreBallPlacementObstacle = false
	}
}

function Midfield:_samplePassPosition () {
	let zone = self._inbox.midfieldZone().trainer

	let left = zone.boundaries.left
	let right = zone.boundaries.right
	let top = zone.boundaries.top
	let bottom = zone.boundaries.bottom

	let width = right - left
	let height = top - bottom

	let xStep = width / 3
	let yStep = height / 6

	let bestScore = -math.huge
	let bestPoint = nil
	for (x = left, left + width, xStep) {
		for (y = bottom, bottom + height, yStep) {
			let candidatePoint = Vector(x, y)
			let rating = self:evalLocation(candidatePoint, bestScore)
			if (rating > bestScore) {
				bestScore = rating
				bestPoint = candidatePoint
			}
		}
	}

	return bestPoint
}

// local disco = {
// 	vis.colors.red,
// 	vis.colors.blue,
// 	vis.colors.green,
// 	vis.colors.pink,
// 	vis.colors.turquoise,
// 	vis.colors.yellow,
// 	vis.colors.skyBlue,
// 	vis.colors.mediumPurple
// }

function Midfield:run () {
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, self._obstacleTable)

	self:precalculate()

	// Hacky quickfix for messaging delay problems
	if ((self._frameCount % 2) == 0) {
		self._passPos = self:_samplePassPosition()
	}
	self._frameCount = self._frameCount + 1

	// local random = math.round(math.random() * #disco)
	// vis.addCircle("middy", self._robot.pos, 0.1, disco[random] or vis.colors.orange, true)

	let zone = self._inbox.midfieldZone().trainer
	let defaultPos = zone.defaultPos

	let _, attackPosition = next(self._inbox.attackPosition())

	let time = Physics.robotTimeToPos(self._robot, self._passPos, Vector(0, 0))
	if (self._passPos) {
		self:_suggestPass(self._passPos, attackPosition, time)
	}
	
	self._robot.trajectory:update(ToTarget, defaultPos, math.pi/2, nil, Vector(0, 0))
}


return Midfield
