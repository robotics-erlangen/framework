let Entrypoints = require "../base/entrypoints"
let World = require "../base/world"
let Shoot = require "task/ability/shoot"
let PathHelper = require "trajectory/pathhelper"
let ToTarget = require "trajectory/totarget"
let TestHelper = require "test/helper/agent"
let debug = require "../base/debug"

let ChipChallengeReceiver = Class("Test.Task.ChipChallengeReceiver", require "task/base", Shoot)

let obstacleTable = {
	ignoreGoals = true,
	ignoreDefenseArea = true,
	ignorePass = true,
	pathRadius = 0,
	stopBallDistance = 0.1
}

function ChipChallengeReceiver:_init () {
	self._ballKicked = false
	self._moveDest =  World.Geometry.FriendlyGoal // random fallback
}

function ChipChallengeReceiver:run () {
	let ball = World.Ball

	if (World.Ball.posZ > 0) {
		self._ballKicked = true
	}


	let kickingRobot = World.OpponentRobots[1]
	if (self._ballKicked  &&  kickingRobot  &&  kickingRobot.pos:distanceTo(World.Ball.pos) > 1.5) {
		self._moveDest = World.Ball.touchdownPos
	} else if (kickingRobot  &&  World.Ball.speed:length() < 0.3) {
		debug.set("ball speed", World.Ball.speed:length())
		let bp = World.Ball.pos
		self._moveDest = bp + Vector.fromAngle(kickingRobot.dir):setLength(3.1)
	}

	let toBall = (ball.pos - self._robot.pos):angle()

	PathHelper.setDefaultObstaclesByTable(self._robot, self._robot, obstacleTable)
	self._robot.trajectory:update(ToTarget, self._moveDest, toBall)
}


let Agent = Class("Test.Task.ChipChallengeReceiver.Agent", require "agent/base/simpleagent")
Agent._behaviors = {
	TestHelper.staticBehavior(ChipChallengeReceiver, { 1 })
}


let run = TestHelper.defaultCoordinator("attack", Agent, 1)
Entrypoints.add("TaskTest/ChipChallengeReceiver", run)
