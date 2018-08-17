import * as Entrypoints from "base/entrypoints";
import * as World from "base/world";

let TestHelper = require "test/helper/agent"
import * as PathHelper from "glados/trajectory/pathhelper";
let CatchballAbility = require "task/ability/catchball"

let CatchballTask = Class("Test.Task.Catchball.Task", require "task/base", CatchballAbility)

let obstacleTable = {
	ignorePass = true
}

function CatchballTask:_init () {
}

function CatchballTask:run () {
	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)
	this._robot:setDribblerSpeed(1)
	this._catchBall(World.Geometry.OpponentGoal)
}

let CatchballBehavior = TestHelper.staticBehavior(CatchballTask, {})

let CatchballAgent = Class("Test.Task.Catchball.Agent", require "agent/base/simpleagent")
CatchballAgent._behaviors = {
	CatchballBehavior
}

let run = TestHelper.defaultCoordinator("attack", CatchballAgent, 1)
Entrypoints.add("TaskTest/Catchball", run)
