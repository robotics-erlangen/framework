import * as Entrypoints from "base/entrypoints";
import * as World from "base/world";
let Shoot = require "task/ability/shoot"
import * as PathHelper from "glados/trajectory/pathhelper";
import * as ToTarget from "glados/trajectory/totarget";
let TestHelper = require "test/helper/agent"
import * as debug from "base/debug";

let ChipChallengeReceiver = Class("Test.Task.ChipChallengeReceiver", require "task/base", Shoot)

let obstacleTable = {
	ignoreGoals = true,
	ignoreDefenseArea = true,
	ignorePass = true,
	pathRadius = 0,
	stopBallDistance = 0.1
}

function ChipChallengeReceiver:_init () {
	this._ballKicked = false
	this._moveDest =  World.Geometry.FriendlyGoal // random fallback
}

function ChipChallengeReceiver:run () {
	let ball = World.Ball

	if (World.Ball.posZ > 0) {
		this._ballKicked = true
	}


	let kickingRobot = World.OpponentRobots[1]
	if (this._ballKicked && kickingRobot && kickingRobot.pos.distanceTo(World.Ball.pos) > 1.5) {
		this._moveDest = World.Ball.touchdownPos
	} else if (kickingRobot && World.Ball.speed.length() < 0.3) {
		debug.set("ball speed", World.Ball.speed.length())
		let bp = World.Ball.pos
		this._moveDest = bp + Vector.fromAngle(kickingRobot.dir).setLength(3.1)
	}

	let toBall = (ball.pos - this._robot.pos).angle()

	PathHelper.setDefaultObstaclesByTable(this._robot, this._robot, obstacleTable)
	this._robot.trajectory.update(ToTarget, this._moveDest, toBall)
}


let Agent = Class("Test.Task.ChipChallengeReceiver.Agent", require "agent/base/simpleagent")
Agent._behaviors = {
	TestHelper.staticBehavior(ChipChallengeReceiver, { 1 })
}


let run = TestHelper.defaultCoordinator("attack", Agent, 1)
Entrypoints.add("TaskTest/ChipChallengeReceiver", run)
