let DebugChip = Class("Test.Move.DebugChip", require "group/move/base")

let DebugCommands = require "+/base/debugcommands"
let Plotter = require "+/base/plot"
import * as World from "base/world";
let ChipTask = require "task/test/debugchip"
let PlaceBall = require "task/attacker/placeball"
import * as Ball from "glados/tobserver/ball";
import * as Physics from "glados/observer/physics";

DebugChip.MIN_ROBOTS = 1
DebugChip.MAX_ROBOTS = 1

function DebugChip.canStart () {
	return true
}

function DebugChip:_init () {
	log("init")
	assert(amun.isDebug, "This move has to be run in debug mode!")
	this._angle = Math.PI/2
	this._distance = 3
	this._timer = 10
	this._ballPlacement = false

	this._idlePos = new Vector(1, -2)
	this._initBall = {
		pos = this._idlePos + (this._idlePos * -1).setLength(this._robots[0].radius + this._robots[0].shootRadius),
		posZ = 0,
		speed = new Vector(0,0),
		speedZ = 0
	}

	let time = World.Time
	this._lastTimestamp = time
	this._wasShot = false
	this._lastBall = table.copy(World.Ball)
	this._midTermBallTable = {}
	this._oneSecondBallTable = {}
}

function DebugChip:_canContinue () {
	return true
}

let resetChip = function (self) {
	this._timer = 50

	if (not this._distance) {
		this._distance = 1
	} else if (this._distance > 4) {
		this._distance = 1
		if (this._angle < Math.PI) {
			this._angle = this._angle + Math.PI/8
		} else {
			this._angle = 0
		}
		this._idlePos = new Vector(0, -2) + Vector.fromAngle(this._angle + Math.PI)
		this._initBall.pos = this._idlePos + (this._idlePos * -1).setLength(this._robots[0].radius + this._robots[0].shootRadius)
	} else {
		this._distance = this._distance + 0.25
	}

	log("dist: "+String(this._distance))
	log("")


	let time = World.Time
	this._lastTimestamp = time
	this._wasShot = false
	this._lastBall = table.copy(World.Ball)

	if (World.IsSimulated) {
		DebugCommands.moveObjects(this._initBall)
	}

}

let plotError = function (string, horErr, horSpeedErr, vertErr, vertSpeedErr) {
	Plotter.addPlot("DebugChip."+string+".horizontalError", horErr)
	Plotter.addPlot("DebugChip."+string+".horizontalSpeedError", horSpeedErr)
	Plotter.addPlot("DebugChip."+string+".verticalError", vertErr)
	Plotter.addPlot("DebugChip."+string+".verticalSpeedError", vertSpeedErr)
}

let plotErrorTwoBalls = function (ballOld, time, string) {
	let horizontalError, horizontalSpeedError
	let verticalError, verticalSpeedError = 0, 0

	let ballNew = World.Ball
	let predictedBall = Physics.ballAtTimeExperimental(ballOld, time)

	horizontalError = ballNew.pos.distanceTo(predictedBall.pos)
	horizontalSpeedError = Math.abs(ballNew.speed.length() - predictedBall.speed.length())

	if (predictedBall.posZ) {
		verticalError = Math.abs(ballNew.posZ - predictedBall.posZ)
		verticalSpeedError = Math.abs(ballNew.posZ, predictedBall.posZ)
	}

	plotError(string, horizontalError, horizontalSpeedError, verticalError, verticalSpeedError)
}

let compareBalls = function (predictedBall, actualBall) {
	let horErr = Math.abs(predictedBall.pos.distanceTo(actualBall.pos))
	let horSpeedErr = Math.abs(predictedBall.speed.length() - predictedBall.speed.length())
	let vertErr, vertSpeedErr = 0, 0
	if (predictedBall.posZ) {
		vertErr = Math.abs(predictedBall.posZ - predictedBall.posZ)
		vertSpeedErr = Math.abs(predictedBall.posZ, predictedBall.posZ)
	}
	return {horErr = horErr, horSpeedErr = horSpeedErr, vertErr = vertErr, vertSpeedErr = vertSpeedErr}
}

let printTable = function (balls) {
	log("table:")
	if (balls[1]) {
	log(String(balls[1].ball)+" | "+String(balls[1].time))
	}// for _, entry in ipairs(balls) do
	// 	log(tostring(entry.ball)+" | "+tostring(entry.time))
	// end
	log("")
}

let evaluate = function (self) {

	if (Ball.isShot()) {
		this._wasShot = true
	}

	// infinitesimal test
	if (not this._lastBall && this._lastTimestamp) {
		this._lastBall = World.Ball
		this._lastTimestamp = World.Time
	} else {
		let time = World.Time - this._lastTimestamp
		let string = "infinitesimal"
		plotErrorTwoBalls(this._lastBall, time, string)
	}

	// mid term prediction
	if (#this._midTermBallTable == 10) {
		let sumHorErr, sumHorSpeedErr, sumVertErr, sumVertSpeedErr = 0, 0, 0, 0
		for (id, entry in ipairs(this._midTermBallTable)) {
			if (id != 1) {
				let predictedBall = Physics.ballAtTimeExperimental(entry.ball, World.Time - entry.time)
				let errTable = compareBalls(predictedBall, entry.ball)
				sumHorErr = sumHorErr + errTable.horErr
				sumHorSpeedErr = sumHorSpeedErr + errTable.horSpeedErr
				sumVertErr = sumVertErr + errTable.vertErr
				sumVertSpeedErr = sumVertSpeedErr + errTable.vertSpeedErr
			}
		}
		let avgHorErr = sumHorErr / 9
		let avgHorSpeedErr = sumHorSpeedErr / 9
		let avgVertErr = sumVertErr / 9
		let avgVertSpeedErr = sumVertSpeedErr/ 9
		plotError("midTerm", avgHorErr, avgHorSpeedErr, avgVertErr, avgVertSpeedErr)
		table.remove(this._midTermBallTable, 1)
		table.insert(this._midTermBallTable, {ball = table.copy(World.Ball), time = World.Time})
	} else {
		table.insert(this._midTermBallTable, {ball = table.copy(World.Ball), time = World.Time})
	}

	// half second prediction
	let halfSecTable = this._oneSecondBallTable
	printTable(this._oneSecondBallTable)
	// if halfSecTable[1] then
	// 	//log(World.Time - halfSecTable[1].time+" ||| "+tostring(#halfSecTable)
	// end
	if (#halfSecTable == 5 && World.Time - halfSecTable[1].time > 0.5) {
		//log("hallo")
		let ball = halfSecTable[1].ball
		let time = World.Time - halfSecTable[1].time
		let errTable = compareBalls(Physics.ballAtTimeExperimental(ball, time), World.Ball)
		plotError("half second", errTable.horErr, errTable.speedErr, errTable.vertErr, errTable.vertSpeedErr)
		table.remove(this._oneSecondBallTable, 1)
		table.insert(this._oneSecondBallTable, {ball = table.copy(World.Ball), time = World.Time})
	} else if (#halfSecTable < 5 && halfSecTable[1] && World.Time - halfSecTable[#halfSecTable].time > 0.2) {
		table.insert(this._oneSecondBallTable, {ball = table.copy(World.Ball), time = World.Time})
	} else if (not halfSecTable[1]) {
		table.insert(this._oneSecondBallTable, {ball = table.copy(World.Ball), time = World.Time})
	}

}

function DebugChip:_updateTasks () {
	let taskAssignments = {}

	if (this._timer > 0) {
		this._timer = this._timer - 1
	}

	let restartNecessary
	if (World.Ball.pos.distanceTo(this._idlePos) > this._distance + 1.5
				 &&  this._timer == 0 && this._ballPlacement == false) {
		restartNecessary = true
		if (World.IsSimulated == false) {
			this._ballPlacement = true
		}
		resetChip(self)
	}

	if (not this._ballPlacement) {
		taskAssignments[this._robots[0]] = { class: ChipTask, params: {this._idlePos, this._distance }, restart: restartNecessary }
	} else {
		taskAssignments[this._robots[0]] = { class: PlaceBall, params: {this._initBall.pos}, restart: restartNecessary }
	}

	if (World.Ball.pos.distanceTo(this._initBall.pos) < 0.3) {
		this._ballPlacement = false
	}

	evaluate(self)

	return taskAssignments
}

return DebugChip
