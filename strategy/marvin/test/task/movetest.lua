local Entrypoints = require "../base/entrypoints"
local plot = require "../base/plot"
local World = require "../base/world"
local AgentPool = require "control/agentpool"
local Coordinator = require "control/coordinator"
local Trainer = require "trainer/trainer"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


local START_POS = Vector(0, -1)
local CENTER_DIST = 0.05
local ANGLE_STEP = 45/180*math.pi
local WAIT_TIME = 3


local MoveTestTask = Class("Test.Task.MoveTest.Task", require "task/base")
function MoveTestTask:_init()
	self._dest = nil
	self._atTargetSince = nil
	self._angle = 0
end

function MoveTestTask:run()
	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)

	local pos
	if self._dest then
		pos = self._dest
	else
		pos = START_POS
	end

	local targetDist = self._robot.pos:distanceTo(pos)
	if targetDist < 0.01 and self._atTargetSince == nil then
		self._atTargetSince = World.Time
	elseif targetDist > 0.02 then
		self._atTargetSince = nil
	end
	if self._atTargetSince and World.Time - self._atTargetSince > WAIT_TIME then
		if self._dest then
			self._dest = nil
		else
			self._dest = START_POS + Vector.fromAngle(self._angle):scaleLength(CENTER_DIST)
			self._angle = self._angle + ANGLE_STEP
		end
	end

	plot.addPlot("positionError." .. tostring(self._robot.id), self._robot.pos:distanceTo(pos))
	self._robot.trajectory:update(ToTarget, pos, 0)
end


local Position = Class("Test.Task.MoveTest.Behavior", require "agent/base/behavior")
function Position:check()
	return true
end

function Position:_updateTask()
	return MoveTestTask, {}
end


local MoveAgent = Class("Test.Task.MoveTest", require "agent/base/simpleagent")
MoveAgent._behaviors = {
	Position
}


local coord = nil

local function run()
	if coord == nil then
		local trainer = Trainer()
		local pools = { path = AgentPool(MoveAgent, 1) }
		local poolGroups = { { pools.path } }
		coord = Coordinator(trainer, pools, poolGroups)
	end
	coord:run()
end

Entrypoints.add("TaskTest/MoveTest", run)
