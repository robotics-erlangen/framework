import * as Entrypoints from "base/entrypoints";
import * as plot from "base/plot";
import * as World from "base/world";
let AgentPool = require "control/agentpool"
let Coordinator = require "control/coordinator"
let Trainer = require "trainer/trainer"
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";

let G = World.Geometry

let CENTER_DIST = 7.8
let START_ANGLE = 90/180*Math.PI
let ANGLE_STEP = 360/180*Math.PI
let WAIT_TIME = 3
let ROBOT_ORIENTATION = 90/180*Math.PI
let ROBOT_ORIENTATION_STEP = 0/180*Math.PI

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
//{ Vector(-1.8, 3.9), new Vector(0, 3.9), new Vector(0, -3.9), new Vector(1.8, -3.9), new Vector(1.8, 3.9), new Vector(-1.8, -3.9) }

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
	this._dest = nil
	this._atTargetSince = nil
	this._startPos = POS_LIST[1]
	this._centerDist = CENTER_DIST
	this._angle = START_ANGLE
	this._angleStep = ANGLE_STEP
	this._robotOrientation = ROBOT_ORIENTATION
	this._robbotOrientationStep = ROBOT_ORIENTATION_STEP
	this._orientation = ROBOT_ORIENTATION
	this._robotState = 0
}

function VisionTestTask:run () {
	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)

	let idx, total = indexCalculation(this._inbox, this._robot.id)
	let offset = new Vector((idx - total/2) * 0.25, 0)

	let pos
	if (this._dest) {
		pos = this._dest + offset
	} else {
		pos = this._startPos + offset
	}
	let dir = this._orientation

	let targetDist = this._robot.pos.distanceTo(pos)
	//log(targetDist)
	if (targetDist < 0.2 && this._atTargetSince == undefined) {
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
			this._startPos = POS_LIST[this._robotState+1]
			this._robotState = (this._robotState + 1) % #POS_LIST
		}
		this._orientation = this._orientation + ROBOT_ORIENTATION_STEP
	}

	plot.addPlot("positionError."  +  String(this._robot.id), this._robot.pos.distanceTo(pos))
	this._robot.trajectory.update(ToTarget, pos, dir, 1)
}


let Position = Class("Test.Task.VisionTest.Behavior", require "agent/base/behavior")
function Position:check () {
	this._send.attackerFlag("all")
	// also receive own message
	return next(this._inbox.attackerFlag("broadcast")) != nil
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
	if (coord == undefined) {
		let trainer = Trainer()
		let pools = { path = AgentPool(MoveAgent, World.FriendlyRobots.lengthAll) }
		let poolGroups = { { pools.path } }
		coord = Coordinator(trainer, pools, poolGroups)
	}
	coord:run()
}

Entrypoints.add("TaskTest/VisionTest", run)
