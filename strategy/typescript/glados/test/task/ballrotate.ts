import * as Entrypoints from "base/entrypoints";
let TestHelper = require "test/helper/agent"
import * as PathHelper from "glados/trajectory/pathhelper";
let BallRotate = require "trajectory/ballrotate"


let Task = Class("Test.Task.BallRotate.Task", require "task/base")

let obstacleTable = {
	ignorePass = true
}

function Task:_init () {
}

function Task:run () {
	PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)

	this._robot.trajectory.update(BallRotate, 0.3, 0.2, true)
}


let TestBehaviour = TestHelper.staticBehavior(Task, {})


let BallAgent = Class("Test.Task.BallRotate.Agent", require "agent/base/simpleagent")
BallAgent._behaviors = {
	TestBehaviour
}
// local SimpleAgent = require "agent/base/simpleagent"
// function SimpleAgent.checkRobot(robot)
// 	return robot ~= World.FriendlyKeeper and not robot.userControl
// end



let run = TestHelper.defaultCoordinator("defend", BallAgent, 1)
Entrypoints.add("TaskTest/BallRotate", run)
