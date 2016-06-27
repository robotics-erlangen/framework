local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"
local TestHelper = require "test/helper/agent"
local PathHelper = require "trajectory/pathhelper"
local BallRotate = require "trajectory/ballrotate"


local Task = Class("Test.Task.BallRotate.Task", require "task/base")

function Task:_init()
end

function Task:run()
	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)

	self._robot.trajectory:update(BallRotate, 0.3, 0.2, true)
end


local TestBehaviour = TestHelper.staticBehavior(Task, {})


local BallAgent = Class("Test.Task.BallRotate.Agent", require "agent/base/simpleagent")
BallAgent._behaviors = {
	TestBehaviour
}
-- local SimpleAgent = require "agent/base/simpleagent"
-- function SimpleAgent.checkRobot(robot)
-- 	return robot ~= World.FriendlyKeeper and not robot.userControl
-- end



local run = TestHelper.defaultCoordinator("defend", BallAgent, 1)
Entrypoints.add("TaskTest/BallRotate", run)
