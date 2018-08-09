local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"
local Shoot = require "task/ability/shoot"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local TestHelper = require "test/helper/agent"


local ChipLearningTest = Class("Test.Task.ChipLearningTest", require "task/base", Shoot)

local DO_LINEAR_SHOOT = true

local obstacleTable = {
	ignorePass = true
}

function ChipLearningTest:_init()
	self._framesSinceMove = 0
	self._shootSpeed = 0
	self._shootPos = Vector(0, 0)
	self._maxShootSpeed = 6
end

function ChipLearningTest:run()
	local stayOnPos = false
	if (World.Ball.speed:length() < 0.4 or self._robot.pos:distanceTo(World.Ball.pos) < 0.3)  and math.abs(World.Ball.pos.x) < World.Geometry.FieldWidthHalf and
		math.abs(World.Ball.pos.y) < World.Geometry.FieldHeightHalf then
		self._framesSinceMove = self._framesSinceMove + 1
		if self._framesSinceMove == 9 then
			local randX = World.Geometry.FieldWidthHalf * (math.random() * 2 - 1) * 0.8
			local randY = World.Geometry.FieldHeightHalf * (math.random() * 2 - 1) * 0.8
			self._shootPos = Vector(randX, randY)
			self._shootSpeed = math.random() * self._maxShootSpeed
		end
		if self._framesSinceMove < 10 then
			stayOnPos = true
		else
			// FIXME: broken call to self:_shoot
			self:_shoot(self._shootPos, self._shootSpeed, nil, DO_LINEAR_SHOOT, 3 * math.pi/180, false)
		end
	else
		self._framesSinceMove = 0
		stayOnPos = true
	end
	if stayOnPos then
		PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
		self._robot.trajectory:update(ToTarget, self._robot.pos, math.pi/2)
	end
end


local Agent = Class("Test.Task.ChipLearningTest.Agent", require "agent/base/simpleagent")
Agent._behaviors = {
	TestHelper.staticBehavior(ChipLearningTest, { 1 })
}


local run = TestHelper.defaultCoordinator("attack", Agent, 1)
Entrypoints.add("TaskTest/ChipLearning", run)
