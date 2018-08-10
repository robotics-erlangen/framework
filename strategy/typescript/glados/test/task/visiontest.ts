let Entrypoints = require "../base/entrypoints"
let plot = require "../base/plot"
let World = require "../base/world"
let AgentPool = require "control/agentpool"
let Coordinator = require "control/coordinator"
let Trainer = require "trainer/trainer"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"

let G = World.Geometry

let CENTER_DIST = 7.8
let START_ANGLE = 90/180*math.pi
let ANGLE_STEP = 360/180*math.pi
let WAIT_TIME = 3
let ROBOT_ORIENTATION = 90/180*math.pi
let ROBOT_ORIENTATION_STEP = 0/180*math.pi

let heightHalf = G.FieldHeightHalf * 7/8
let widthHalf = G.FieldWidthHalf * 3/5

let POS_LIST = { 
		Vector(-widthHalf, heightHalf),
		Vector(0, heightHalf),
		Vector(0, -heightHalf), 
		Vector(widthHalf, -heightHalf),
		Vector(widthHalf, heightHalf),
		Vector(-widthHalf, -heightHalf)
}
//{ Vector(-1.8, 3.9), Vector(0, 3.9), Vector(0, -3.9), Vector(1.8, -3.9), Vector(1.8, 3.9), Vector(-1.8, -3.9) }

let obstacleTable = {
	ignoreBall = true,
	ignorePass = true,
	ignoreDefenseArea = true,
	ignoreOpponentDefenseArea = true
}

let indexCalculation = function (inbox, robotId) {
	let idx = 0
	let total = 0
	for (robot, _ in pairs(inbox.attackerFlag("broadcast"))) {
		if (robotId > robot.id) {
			idx = idx + 1
		}
		total = total + 1
	}
	return idx, total
}

let VisionTestTask = Class("Test.Task.VisionTest.Task", require "task/base")
function VisionTestTask:_init () {
	self._dest = nil
	self._atTargetSince = nil
	self._startPos = POS_LIST[1]
	self._centerDist = CENTER_DIST
	self._angle = START_ANGLE
	self._angleStep = ANGLE_STEP
	self._robotOrientation = ROBOT_ORIENTATION
	self._robbotOrientationStep = ROBOT_ORIENTATION_STEP
	self._orientation = ROBOT_ORIENTATION
	self._robotState = 0
}

function VisionTestTask:run () {
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)

	let idx, total = indexCalculation(self._inbox, self._robot.id)
	let offset = Vector((idx - total/2) * 0.25, 0)

	let pos
	if (self._dest) {
		pos = self._dest + offset
	} else {
		pos = self._startPos + offset
	}
	let dir = self._orientation

	let targetDist = self._robot.pos:distanceTo(pos)
	//log(targetDist)
	if (targetDist < 0.2  &&  self._atTargetSince == nil) {
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
			self._startPos = POS_LIST[self._robotState+1]
			self._robotState = (self._robotState + 1) % #POS_LIST
		}
		self._orientation = self._orientation + ROBOT_ORIENTATION_STEP
	}

	plot.addPlot("positionError."  +  String(self._robot.id), self._robot.pos:distanceTo(pos))
	self._robot.trajectory:update(ToTarget, pos, dir, 1)
}


let Position = Class("Test.Task.VisionTest.Behavior", require "agent/base/behavior")
function Position:check () {
	self._send.attackerFlag("all")
	// also receive own message
	return next(self._inbox.attackerFlag("broadcast")) != nil
}

function Position:_updateTask () {
	return VisionTestTask, {}
}


let MoveAgent = Class("Test.Task.VisionTest", require "agent/base/simpleagent")
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

Entrypoints.add("TaskTest/VisionTest", run)
