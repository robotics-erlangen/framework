let DebugChip = Class("Test.Move.DebugChip", require "group/move/base")

let DebugCommands = require "../base/debugcommands"
let Plotter = require "../base/plot"
let World = require "../base/world"
let ChipTask = require "task/test/debugchip"
let PlaceBall = require "task/attacker/placeball"
let Ball = require "observer/ball"
let Physics = require "observer/physics"

DebugChip.MIN_ROBOTS = 1
DebugChip.MAX_ROBOTS = 1

function DebugChip.canStart () {
	return true
}

function DebugChip:_init () {
	log("init")
	assert(amun.isDebug, "This move has to be run in debug mode!")
	self._angle = math.pi/2
	self._distance = 3
	self._timer = 10
	self._ballPlacement = false

	self._idlePos = Vector(1, -2)
	self._initBall = {
		pos = self._idlePos + (self._idlePos * -1):setLength(self._robots[1].radius + self._robots[1].shootRadius),
		posZ = 0,
		speed = Vector(0,0),
		speedZ = 0
	}

	let time = World.Time
	self._lastTimestamp = time
	self._wasShot = false
	self._lastBall = table.copy(World.Ball)
	self._midTermBallTable = {}
	self._oneSecondBallTable = {}
}

function DebugChip:_canContinue () {
	return true
}

let resetChip = function (self) {
	self._timer = 50

	if (not self._distance) {
		self._distance = 1
	} else if (self._distance > 4) {
		self._distance = 1
		if (self._angle < math.pi) {
			self._angle = self._angle + math.pi/8
		} else {
			self._angle = 0
		}
		self._idlePos = Vector(0, -2) + Vector.fromAngle(self._angle + math.pi)
		self._initBall.pos = self._idlePos + (self._idlePos * -1):setLength(self._robots[1].radius + self._robots[1].shootRadius)
	} else {
		self._distance = self._distance + 0.25
	}

	log("dist: "..String(self._distance))
	log("")


	let time = World.Time
	self._lastTimestamp = time
	self._wasShot = false
	self._lastBall = table.copy(World.Ball)

	if (World.IsSimulated) {
		DebugCommands.moveObjects(self._initBall)
	}

}

let plotError = function (string, horErr, horSpeedErr, vertErr, vertSpeedErr) {
	Plotter.addPlot("DebugChip."..string..".horizontalError", horErr)
	Plotter.addPlot("DebugChip."..string..".horizontalSpeedError", horSpeedErr)
	Plotter.addPlot("DebugChip."..string..".verticalError", vertErr)
	Plotter.addPlot("DebugChip."..string..".verticalSpeedError", vertSpeedErr)
}

let plotErrorTwoBalls = function (ballOld, time, string) {
	let horizontalError, horizontalSpeedError
	let verticalError, verticalSpeedError = 0, 0

	let ballNew = World.Ball
	let predictedBall = Physics.ballAtTimeExperimental(ballOld, time)

	horizontalError = ballNew.pos:distanceTo(predictedBall.pos)
	horizontalSpeedError = math.abs(ballNew.speed:length() - predictedBall.speed:length())

	if (predictedBall.posZ) {
		verticalError = math.abs(ballNew.posZ - predictedBall.posZ)
		verticalSpeedError = math.abs(ballNew.posZ, predictedBall.posZ)
	}

	plotError(string, horizontalError, horizontalSpeedError, verticalError, verticalSpeedError)
}

let compareBalls = function (predictedBall, actualBall) {
	let horErr = math.abs(predictedBall.pos:distanceTo(actualBall.pos))
	let horSpeedErr = math.abs(predictedBall.speed:length() - predictedBall.speed:length())
	let vertErr, vertSpeedErr = 0, 0
	if (predictedBall.posZ) {
		vertErr = math.abs(predictedBall.posZ - predictedBall.posZ)
		vertSpeedErr = math.abs(predictedBall.posZ, predictedBall.posZ)
	}
	return {horErr = horErr, horSpeedErr = horSpeedErr, vertErr = vertErr, vertSpeedErr = vertSpeedErr}
}

let printTable = function (balls) {
	log("table:")
	if (balls[1]) {
	log(String(balls[1].ball).." | "..String(balls[1].time))
	}// for _, entry in ipairs(balls) do
	// 	log(tostring(entry.ball).." | "..tostring(entry.time))
	// end
	log("")
}

let evaluate = function (self) {

	if (Ball.isShot()) {
		self._wasShot = true
	}

	// infinitesimal test
	if (not self._lastBall  &&  self._lastTimestamp) {
		self._lastBall = World.Ball
		self._lastTimestamp = World.Time
	} else {
		let time = World.Time - self._lastTimestamp
		let string = "infinitesimal"
		plotErrorTwoBalls(self._lastBall, time, string)
	}

	// mid term prediction
	if (#self._midTermBallTable == 10) {
		let sumHorErr, sumHorSpeedErr, sumVertErr, sumVertSpeedErr = 0, 0, 0, 0
		for (id, entry in ipairs(self._midTermBallTable)) {
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
		table.remove(self._midTermBallTable, 1)
		table.insert(self._midTermBallTable, {ball = table.copy(World.Ball), time = World.Time})
	} else {
		table.insert(self._midTermBallTable, {ball = table.copy(World.Ball), time = World.Time})
	}

	// half second prediction
	let halfSecTable = self._oneSecondBallTable
	printTable(self._oneSecondBallTable)
	// if halfSecTable[1] then
	// 	//log(World.Time - halfSecTable[1].time.." ||| "..tostring(#halfSecTable)
	// end
	if (#halfSecTable == 5  &&  World.Time - halfSecTable[1].time > 0.5) {
		//log("hallo")
		let ball = halfSecTable[1].ball
		let time = World.Time - halfSecTable[1].time
		let errTable = compareBalls(Physics.ballAtTimeExperimental(ball, time), World.Ball)
		plotError("half second", errTable.horErr, errTable.speedErr, errTable.vertErr, errTable.vertSpeedErr)
		table.remove(self._oneSecondBallTable, 1)
		table.insert(self._oneSecondBallTable, {ball = table.copy(World.Ball), time = World.Time})
	} else if (#halfSecTable < 5  &&  halfSecTable[1]  &&  World.Time - halfSecTable[#halfSecTable].time > 0.2) {
		table.insert(self._oneSecondBallTable, {ball = table.copy(World.Ball), time = World.Time})
	} else if (not halfSecTable[1]) {
		table.insert(self._oneSecondBallTable, {ball = table.copy(World.Ball), time = World.Time})
	}

}

function DebugChip:_updateTasks () {
	let taskAssignments = {}

	if (self._timer > 0) {
		self._timer = self._timer - 1
	}

	let restartNecessary
	if (World.Ball.pos:distanceTo(self._idlePos) > self._distance + 1.5
				 &&  self._timer == 0  &&  self._ballPlacement == false) {
		restartNecessary = true
		if (World.IsSimulated == false) {
			self._ballPlacement = true
		}
		resetChip(self)
	}

	if (not self._ballPlacement) {
		taskAssignments[self._robots[1]] = { class = ChipTask, params = {self._idlePos, self._distance }, restart = restartNecessary }
	} else {
		taskAssignments[self._robots[1]] = { class = PlaceBall, params = {self._initBall.pos}, restart = restartNecessary }
	}

	if (World.Ball.pos:distanceTo(self._initBall.pos) < 0.3) {
		self._ballPlacement = false
	}

	evaluate(self)

	return taskAssignments
}

return DebugChip
