local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"

local TestHelper = require "test/helper/agent"
local PathHelper = require "trajectory/pathhelper"
local CatchballAbility = require "task/ability/catchball"

local CatchballTask = Class("Test.Task.Catchball.Task", require "task/base", CatchballAbility)

local obstacleTable = {
	ignorePass = true
}

function CatchballTask:_init()
end

function CatchballTask:run()
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot:setDribblerSpeed(1)
	self:_catchBall(World.Geometry.OpponentGoal)
end

local CatchballBehavior = TestHelper.staticBehavior(CatchballTask, {})

local CatchballAgent = Class("Test.Task.Catchball.Agent", require "agent/base/simpleagent")
CatchballAgent._behaviors = {
	CatchballBehavior
}

local run = TestHelper.defaultCoordinator("attack", CatchballAgent, 1)
Entrypoints.add("TaskTest/Catchball", run)
