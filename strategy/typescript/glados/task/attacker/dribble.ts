let CatchBall = require "task/ability/catchball"
let SuggestPass = require "task/ability/suggestpass"
let Dribble = Class("Task.Dribble", require "task/base", SuggestPass, CatchBall)

let World = require "../base/world"
let Physics = require "observer/physics"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"

// Warning: This task has some very strict precoditions.
// 1. It will only work if you have the ball in the dribbler at the start
// 2. you have to make sure (somehow) that the (robotPos - waypoint[2]  {returned by path}):absoluteAngleDiff(viewDir) is pretty small

let obstacleTable = {
	ignoreBall = true,
	ignorePass = true
}
function Dribble:_init (pos, suggestPass, endSpeedLength) {
	self._pos = pos
	self._dir = (pos - self._robot.pos):angle()
	self._suggestPassFlag = suggestPass
	self._endSpeedLength = endSpeedLength  ||  0
}

function Dribble:run () {
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot:setDribblerSpeed(0.7)

	let time
	if (World.Ball.pos:distanceTo(self._robot.pos) > self._robot.radius + World.Ball.radius + 0.05) {
		let catchTime = self:_catchBall(self._pos, 0)
		time = catchTime + Physics.robotTimeToPos(self._robot, self._pos, Vector(0, 0))
	} else {
		let endSpeed = (self._pos - self._robot.pos):setLength(self._endSpeedLength)
		let _; _, time = self._robot.trajectory:update(ToTarget, self._pos, self._dir, 1.0, endSpeed, nil, true)
	}


	if (self._suggestPassFlag) {
		self:_suggestPass(self._pos, nil, time)
	}
}

return Dribble
