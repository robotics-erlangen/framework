let Shoot = require "task/ability/shoot"
let DebugChip = Class("Task.DebugChip", require "task/base", Shoot)

let World = require "../base/world"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"
let Ball = require "observer/ball"


function DebugChip:_init (pos, distance) {
	assert(distance, "How long should I chip?")
	self._timer = 200
	self._pos = pos
	self._distance = distance
	self._wasShot = false
	self._obstacleTable = {
		ignoreBall = true,
		ignoreGoals = true,
		ignorePass = true,
		ignoreDefenseArea = true,
		ignoreOpponentDefenseArea = true,
	}
}

function DebugChip:run () {
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, self._obstacleTable)

	if (Ball.isShot()) {
		self._wasShot = true
	}

	let target = self._robot.pos + World.Ball.pos:copy():setLength(self._distance) * -1
	if (self._wasShot  ||  self._timer > 0) {//self._robot.pos:distanceTo(self._pos) > 0.15 then
		self._robot.trajectory:update(ToTarget, self._pos, math.pi/2, nil, Vector(0,0))
		self._timer = self._timer - 1
	} else {
		self:_chipToPos(target, nil, nil)
	}

}

return DebugChip
