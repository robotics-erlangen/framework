let Entrypoints = require "../base/entrypoints"
let World = require "../base/world"

let TestHelper = require "test/helper/agent"
let PathHelper = require "trajectory/pathhelper"
let CatchballAbility = require "task/ability/catchball"

let CatchballTask = Class("Test.Task.Catchball.Task", require "task/base", CatchballAbility)

let obstacleTable = {
	ignorePass = true
}

function CatchballTask:_init () {
}

function CatchballTask:run () {
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot:setDribblerSpeed(1)
	self:_catchBall(World.Geometry.OpponentGoal)
}

let CatchballBehavior = TestHelper.staticBehavior(CatchballTask, {})

let CatchballAgent = Class("Test.Task.Catchball.Agent", require "agent/base/simpleagent")
CatchballAgent._behaviors = {
	CatchballBehavior
}

let run = TestHelper.defaultCoordinator("attack", CatchballAgent, 1)
Entrypoints.add("TaskTest/Catchball", run)
