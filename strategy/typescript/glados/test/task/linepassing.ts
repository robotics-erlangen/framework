let Entrypoints = require "../base/entrypoints"
let Vector = require "../base/vector"
let World = require "../base/world"
let AgentPool = require "control/agentpool"
let Coordinator = require "control/coordinator"
let Ball = require "observer/ball"
let Physics = require "observer/physics"
let Pass = require "task/shared/pass"
let Trainer = require "trainer/trainer"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"

//The x coordinates of the lines the robots will return to
let RETURN_LINES = {1.5,-1.5}

//For now, linepassing will only work properly when all robots of the other team are disabled
let lastShotBy = nil

// whether or not to do regular linpassing or a catch ball test
let catchBallTest = false

let Static = Class("Test.Task.LinePassing.Static", require "agent/base/behavior")
function Static:check () {
	self._send.attackerFlag("all")
	let lastRobot = Ball.isShot()
	if (lastRobot) {
		lastShotBy = lastRobot
	}
	if (self._robot != lastShotBy) {
		self:_applyForMainAttacker()
	}
	return false
}



let Passer = Class("Test.Task.LinePassing.Pass", require "agent/base/behavior")
function Passer:check () {
	let otherRobot = next(self._inbox.attackerFlag())
	return self._inbox.mainAttacker().trainer == self._robot  &&  otherRobot
}


function Passer:_updateTask () {
	let otherRobot = next(self._inbox.attackerFlag())
	return Pass, { otherRobot }
}


let obstacleTable = {
	ignorePass = true
}

let MoveToRandom = Class("Test.Task.LinePassing.MoveToRandom", require "task/base")
function MoveToRandom:_init () {
	self._ypos = (math.random() - 0.5) * 2 * (World.Geometry.FieldHeightHalf - 1)
}

function MoveToRandom:run () {
	// get the robot index
	let idx = 1
	for (robot, _ in pairs(self._inbox.attackerFlag())) {
		if (self._robot.id > robot.id) {
			idx = idx + 1
		}
	}
	let mainAttacker = self._inbox.mainAttacker().trainer

	// position where the robot wants the ball
	let passPos = Vector(RETURN_LINES[idx], self._ypos)
	let timeOnPos = Physics.robotTimeToPos(self._robot, passPos,
			(passPos - self._robot.pos):setLength(self._robot.maxSpeed)) + World.Time

	// move to pass pos
	let targetPos = passPos
	let linePos = Vector(RETURN_LINES[idx], self._robot.pos.y)
	if (linePos:distanceTo(self._robot.pos) > 0.3
			// only move if the attacker is near the ball, this ensures that we still move when the attacker gets to the ball
			 ||  mainAttacker  &&  mainAttacker.pos:distanceTo(World.Ball.pos) > 0.5) {
		// return to line before wanting a pass
		timeOnPos = math.huge
		targetPos = linePos
	}

	// notify attacker
	if (mainAttacker) {
		let modifiedPos = passPos
		if (catchBallTest) {
			modifiedPos = targetPos - Vector(0,math.sign(targetPos.y)*0.5)
		}
		self._send.passSuggestion("all", { ballPos = modifiedPos, time = timeOnPos })
	}

	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)

	self._robot.trajectory:update(ToTarget, targetPos, (-targetPos):angle())
}


let Position = Class("Test.Task.LinePassing.Position", require "agent/base/behavior")
function Position:check () {
	let otherRobot = next(self._inbox.attackerFlag())
	return otherRobot
}

function Position:_updateTask () {
	return MoveToRandom, {}
}



let LinePassAgent = Class("Test.Task.LinePassAgent", require "agent/base/simpleagent")
LinePassAgent._behaviors = {
	Static,
	Passer,
	Position
}

let coord = nil

let run = function () {
	catchBallTest = false
	if (coord == nil) {
		let trainer = Trainer()
		let pools = { pass = AgentPool(LinePassAgent, 2) }
		let poolGroups = { { pools.pass } }
		coord = Coordinator(trainer, pools, poolGroups)
	}
	coord:run()
}

let runCatchBall = function () {
	catchBallTest = true
	if (coord == nil) {
		let trainer = Trainer()
		let pools = { pass = AgentPool(LinePassAgent, 2) }
		let poolGroups = { { pools.pass } }
		coord = Coordinator(trainer, pools, poolGroups)
	}
	coord:run()
}

Entrypoints.add("TaskTest/LinePassing", run)
Entrypoints.add("TaskTest/LinePassing(CatchBall)", runCatchBall)
