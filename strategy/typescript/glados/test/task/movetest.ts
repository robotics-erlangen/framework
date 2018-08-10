let Entrypoints = require "../base/entrypoints"
let plot = require "../base/plot"
let World = require "../base/world"
let AgentPool = require "control/agentpool"
let Coordinator = require "control/coordinator"
let Trainer = require "trainer/trainer"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"


let START_POS = Vector(0, 0.5)
let CENTER_DIST = 1.3
let START_ANGLE = 60/180*math.pi
let ANGLE_STEP = 360/180*math.pi
let WAIT_TIME = 3
let ROBOT_ORIENTATION = 0/180*math.pi
let ROBOT_ORIENTATION_STEP = 300/180*math.pi

let obstacleTable = {
	ignorePass = true
}

let MoveTestTask = Class("Test.Task.MoveTest.Task", require "task/base")
function MoveTestTask:_init (idx, total) {
	self._dest = nil
	self._atTargetSince = nil
	self._angle = START_ANGLE
	self._orientation = ROBOT_ORIENTATION
	// line up robots
	self._startPos = START_POS + Vector((idx - total/2) * 0.5, 0)
}

function MoveTestTask:run () {
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)

	let pos
	if (self._dest) {
		pos = self._dest
	} else {
		pos = self._startPos
	}
	let dir = self._orientation

	let targetDist = self._robot.pos:distanceTo(pos)
	if (targetDist < 0.05  &&  self._atTargetSince == nil) {
		self._atTargetSince = World.Time
	} else if (targetDist > 0.01) {
		self._atTargetSince = nil
	}
	let synchronized = false
	if (self._atTargetSince  &&  World.Time - self._atTargetSince > WAIT_TIME) {
		self._send.defenderFlag("all")
		synchronized = (table.count(self._inbox.attackerFlag("broadcast")) - table.count(self._inbox.defenderFlag("broadcast"))) == 0
	}
	if (synchronized) {
		if (self._dest) {
			self._dest = nil
		} else {
			self._dest = self._startPos + Vector.fromAngle(self._angle):scaleLength(CENTER_DIST)
			self._angle = self._angle + ANGLE_STEP
		}
		self._orientation = self._orientation + ROBOT_ORIENTATION_STEP
	}

	plot.addPlot("positionError."  +  String(self._robot.id), self._robot.pos:distanceTo(pos))
	self._robot.trajectory:update(ToTarget, pos, dir)
}


let Position = Class("Test.Task.MoveTest.Behavior", require "agent/base/behavior")
function Position:check () {
	self._send.attackerFlag("all")
	// also receive own message
	return next(self._inbox.attackerFlag("broadcast")) != nil
}

function Position:_updateTask () {
	let idx = 0
	let total = 0
	for (robot, _ in pairs(self._inbox.attackerFlag())) {
		if (self._robot.id > robot.id) {
			idx = idx + 1
		}
		total = total + 1
	}
	return MoveTestTask, { idx, total }
}


let MoveAgent = Class("Test.Task.MoveTest", require "agent/base/simpleagent")
MoveAgent._behaviors = {
	Position
}


let coord = nil

let run = function () {
	if (coord == nil) {
		let trainer = Trainer()
		let pools = { path = AgentPool(MoveAgent, #World.FriendlyRobotsAll) }
		let poolGroups = { { pools.path } }
		coord = Coordinator(trainer, pools, poolGroups)
	}
	coord:run()
}

Entrypoints.add("TaskTest/MoveTest", run)
