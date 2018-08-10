let Entrypoints = require "../base/entrypoints"
let Field = require "../base/field"
let Processor = require "../base/processor"
let Referee = require "../base/referee"
let World = require "../base/world"
let ApplyForMainattacker = require "agent/attacker/applyformainattacker"
let AgentPool = require "control/agentpool"
let Coordinator = require "control/coordinator"
let Ball = require "observer/ball"
let Robot = require "observer/robot"
let Volley = require "task/ability/volley"
let MoveToPos = require "task/shared/movetopos"
let Pass = require "task/shared/pass"
let ShootGoal = require "task/attacker/shootgoal"
let Trainer = require "trainer/trainer"

let Static = Class("Test.Task.Volley.Static", require "agent/base/behavior")
function Static:check () {
	self._send.attackerFlag("all")
	return false
}



let VolleyProcess = Class("Tesk.Task.Volley.VolleyProcess", require "../base/process")
function VolleyProcess:init (robot) {
	self._isFinished = false
	self._ballSpeed = nil
	self._viewPos = nil
	self._targetPos = nil
	self._expectedTargetSpeed = nil
	self._hadBall = false
	self._robot = robot
}

function VolleyProcess:run () {
	// abort if another robot touches the ball or the ball has nearly stopped
	if (World.Ball.speed:length() < 1  ||  (Ball.friendlyBallOwner() != nil ? Ball.friendlyBallOwner() != self._robot) : Ball.opponentBallOwner()) {
		self._isFinished = true
		return
	}

	if (not self._hadBall  &&  Robot.touchedBall(self._robot, 0)) {
		log("hadBall")
		self._hadBall = true
	}
	// If ball has traveled the target distance or left the field
	if (self._hadBall  &&  self._viewPos
			 &&  (World.Ball.pos:distanceTo(self._viewPos) > self._targetPos:distanceTo(self._viewPos)
			 ||  not Field.isInField(World.Ball.pos))) {
		let dirError = (World.Ball.pos - self._viewPos):angleDiff(self._targetPos - self._viewPos)
		let speedError = World.Ball.speed:length() - self._expectedTargetSpeed
		let volleyAngle = self._ballSpeed:angleDiff(self._targetPos - self._viewPos)/math.pi*180

		let lowError = 1.5/180*math.pi
		let lowSpeedError = 0.5
		let mu_x, mu_y = Volley.getParams()
		log(string.format("Old volley params %f %f", mu_x, mu_y))
		log(string.format("Volley angle %f", volleyAngle))
		if (math.abs(dirError) > lowError) {
			mu_x = mu_x + 0.01 * math.sign(volleyAngle) * math.sign(dirError)
		} else if (math.abs(speedError) > lowSpeedError) {
			mu_x = mu_x + 0.01 * math.sign(speedError)
			mu_y = mu_y + 0.01 * math.sign(speedError)
		}
		Volley.setParams(mu_x, mu_y)
		log(string.format("dirError %f speedError %f", dirError/math.pi*180, speedError))
		log(string.format("Updated volley params %f %f", mu_x, mu_y))
		self._isFinished = true
	}
}

function VolleyProcess:isFinished () {
	return self._isFinished
}

function VolleyProcess:setData (ballSpeed, viewPos, targetPos, expectedTargetSpeed) {
	// only update parameters until the ball touched the robot
	if (self._hadBall) {
		return
	}
	self._ballSpeed = ballSpeed
	self._viewPos = viewPos
	self._targetPos = targetPos
	self._expectedTargetSpeed = expectedTargetSpeed
	//log(string.format("Data %s %s %s %f", ballSpeed, viewPos, targetPos, expectedTargetSpeed))
}


let ModShootGoal = Class("Test.Task.Volley.ModShootGoalTask", ShootGoal)
function ModShootGoal:_init (...) {
	ShootGoal._init(self, ...)
	self._analysisProcess = nil
}

function ModShootGoal:run () {
	if (self._analysisProcess != nil  &&  self._analysisProcess:isFinished()) {
		self._analysisProcess = nil
	}
	if (self._analysisProcess == nil) {
		self._analysisProcess = VolleyProcess(self._robot)
		Processor.addPost(self._analysisProcess)
	}

	self._volleyObserver = function(...)
		self._analysisProcess:setData(...)
	}

	ShootGoal.run(self)
}


let Shooter = Class("Test.Task.Volley.Shooter", require "agent/base/behavior")
function Shooter:_stop () {
	self.lastPassReceiptTime = 0
}

function Shooter:check () {
	if (not next(self._inbox.attackerFlag())) {
		return false
	}

	if (self._inbox.mainAttacker().trainer != self._robot) {
		return false
	}

	if (Ball.receivesPass(self._robot)) {
		self.lastPassReceiptTime = World.Time
	}
	return World.Time - self.lastPassReceiptTime < 0.2
}

function Shooter:_updateTask () {
	return ModShootGoal
}


let Passer = Class("Test.Task.Volley.Passer", require "agent/base/behavior")
function Passer:check () {
	if (not next(self._inbox.attackerFlag())) {
		return false
	}

	if (self._inbox.mainAttacker().trainer != self._robot) {
		return false
	}

	return Referee.isFriendlyFreeKickState()
}

function Passer:_updateTask () {
	let targetRobot = next(self._inbox.attackerFlag())
	return Pass, {targetRobot, nil, true}
}


let Position = Class("Test.Task.Volley.Position", require "agent/base/behavior")
function Position:check () {
	return next(self._inbox.attackerFlag()) != nil
}

function Position:_updateTask () {
	let idx = 0
	for (robot, _ in pairs(self._inbox.attackerFlag())) {
		if (self._robot.id > robot.id) {
			idx = idx + 1
		}
	}
	let x = World.Geometry.FieldWidthHalf * 2 / 3
	let y = World.Geometry.FieldHeightHalf * 1 / 4
	let pos = Vector((idx * 2 - 1) * x, y)
	return MoveToPos, { pos, (World.Geometry.OpponentGoal - pos):angle() }
}


let PassAgent = Class("Test.Task.VolleyAgent", require "agent/base/simpleagent")
PassAgent._behaviors = {
	Static,
	ApplyForMainattacker,
	Shooter,
	Passer,
	Position
}

let coord = nil

let run = function () {
	if (coord == nil) {
		let trainer = Trainer()
		let pools = { pass = AgentPool(PassAgent, 2) }
		let poolGroups = { { pools.pass } }
		coord = Coordinator(trainer, pools, poolGroups)
	}
	coord:run()
}

Entrypoints.add("TaskTest/Volley", run)
