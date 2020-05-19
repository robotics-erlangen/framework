import * as Entrypoints from "base/entrypoints";
import * as plot from "base/plot";
import * as World from "base/world";
let AgentPool = require "control/agentpool"
let Coordinator = require "control/coordinator"
let Trainer = require "trainer/trainer"
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";


let START_POS = new Vector(0, 0.5)
let CENTER_DIST = 1.3
let START_ANGLE = 60/180*Math.PI
let ANGLE_STEP = 360/180*Math.PI
let WAIT_TIME = 3
let ROBOT_ORIENTATION = 0/180*Math.PI
let ROBOT_ORIENTATION_STEP = 300/180*Math.PI

let obstacleTable = {
	ignorePass = true
}

let MoveTestTask = Class("Test.Task.MoveTest.Task", require "task/base")
function MoveTestTask:_init (idx, total) {
	this._dest = nil
	this._atTargetSince = nil
	this._angle = START_ANGLE
	this._orientation = ROBOT_ORIENTATION
	// line up robots
	this._startPos = START_POS + new Vector((idx - total/2) * 0.5, 0)
}

function MoveTestTask:run () {
	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)

	let pos
	if (this._dest) {
		pos = this._dest
	} else {
		pos = this._startPos
	}
	let dir = this._orientation

	let targetDist = this._robot.pos.distanceTo(pos)
	if (targetDist < 0.05 && this._atTargetSince == undefined) {
		this._atTargetSince = World.Time
	} else if (targetDist > 0.01) {
		this._atTargetSince = nil
	}
	let synchronized = false
	if (this._atTargetSince && World.Time - this._atTargetSince > WAIT_TIME) {
		this._send.defenderFlag("all")
		synchronized = (table.count(this._inbox.attackerFlag("broadcast")) - table.count(this._inbox.defenderFlag("broadcast"))) == 0
	}
	if (synchronized) {
		if (this._dest) {
			this._dest = nil
		} else {
			this._dest = this._startPos + Vector.fromPolar(this._angle, CENTER_DIST)
			this._angle = this._angle + ANGLE_STEP
		}
		this._orientation = this._orientation + ROBOT_ORIENTATION_STEP
	}

	plot.addPlot("positionError."  +  String(this._robot.id), this._robot.pos.distanceTo(pos))
	this._robot.trajectory.update(ToTarget, pos, dir)
}


let Position = Class("Test.Task.MoveTest.Behavior", require "agent/base/behavior")
function Position:check () {
	this._send.attackerFlag("all")
	// also receive own message
	return next(this._inbox.attackerFlag("broadcast")) != nil
}

function Position:_updateTask () {
	let idx = 0
	let total = 0
	for (robot, _ in pairs(this._inbox.attackerFlag())) {
		if (this._robot.id > robot.id) {
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
	if (coord == undefined) {
		let trainer = Trainer()
		let pools = { path = AgentPool(MoveAgent, World.FriendlyRobots.lengthAll) }
		let poolGroups = { { pools.path } }
		coord = Coordinator(trainer, pools, poolGroups)
	}
	coord:run()
}

Entrypoints.add("TaskTest/MoveTest", run)
