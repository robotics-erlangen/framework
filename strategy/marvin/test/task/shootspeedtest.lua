local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local TestHelper = require "test/helper/agent"

local obstacleTable = {
	ignorePass = true
}

local ShootSpeedTest = Class("Test.Task.ShootSpeedTest", require "task/base")

function ShootSpeedTest:_init(speed)
	self._shootSpeed = speed
	self._ballInHalf = self._robot.pos.y * World.Ball.pos.y > 0
end

function ShootSpeedTest:run()
	local ballInHalf = self._robot.pos.y * World.Ball.pos.y > 0
	local shootDistance = math.max(0, math.abs(self._robot.pos.y) - self._robot.shootRadius - World.Ball.radius)
	if not ballInHalf and self._ballInHalf then
		log("Ball speed:  Look at the raw values in the plotter")
		log("Shoot speed: " .. tostring(self._robot:calculateShootSpeed(self._shootSpeed, math.abs(self._robot.pos.y))))
		log("Distance:    " .. tostring(shootDistance))
	end
	self._ballInHalf = ballInHalf

	local shootSpeed = self._robot:calculateShootSpeed(self._shootSpeed, shootDistance)
	self._robot:shoot(shootSpeed)
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot.trajectory:update(ToTarget, self._robot.pos, self._robot.pos.y < 0 and math.pi/2 or -math.pi/2)
end


local Agent = Class("Test.Task.ShootSpeedTest.Agent", require "agent/base/simpleagent")
Agent._behaviors = {
	TestHelper.staticBehavior(ShootSpeedTest, { 2 })
}


local run = TestHelper.defaultCoordinator("attack", Agent, 1)
Entrypoints.add("TaskTest/ShootSpeed", run)
