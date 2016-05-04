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
local START_ANGLE = 90/180*math.pi
local ANGLE_STEP = 45/180*math.pi
local WAIT_TIME = 3
local ROBOT_ORIENTATION = 0/180*math.pi


local MoveTestTask = Class("Test.Task.MoveTest.Task", require "task/base")
function MoveTestTask:_init(idx, total)
	self._dest = nil
	self._atTargetSince = nil
	self._angle = START_ANGLE
	-- line up robots
	self._startPos = START_POS + Vector((idx - total/2) * 0.5, 0)
end

function MoveTestTask:run()
	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)

	local pos
	if self._dest then
		pos = self._dest
	else
		pos = self._startPos
	end

	local targetDist = self._robot.pos:distanceTo(pos)
	if targetDist < 0.005 and self._atTargetSince == nil then
		self._atTargetSince = World.Time
	elseif targetDist > 0.01 then
		self._atTargetSince = nil
	end
	local synchronized = false
	if self._atTargetSince and World.Time - self._atTargetSince > WAIT_TIME then
		self._send.defenderFlag("all")
		synchronized = (table.count(self._inbox.attackerFlag()) - table.count(self._inbox.defenderFlag())) == 0
	end
	if synchronized then
		if self._dest then
			self._dest = nil
		else
			self._dest = self._startPos + Vector.fromAngle(self._angle):scaleLength(CENTER_DIST)
			self._angle = self._angle + ANGLE_STEP
		end
	end

	plot.addPlot("positionError." .. tostring(self._robot.id), self._robot.pos:distanceTo(pos))
	self._robot.trajectory:update(ToTarget, pos, ROBOT_ORIENTATION)
end


local Position = Class("Test.Task.MoveTest.Behavior", require "agent/base/behavior")
function Position:check()
	self._send.attackerFlag("all")
	if #World.FriendlyRobots == 1 then
		return true
	end
	return next(self._inbox.attackerFlag()) ~= nil
end

function Position:_updateTask()
	local idx = 0
	local total = 0
	for robot, _ in pairs(self._inbox.attackerFlag()) do
		if self._robot.id > robot.id then
			idx = idx + 1
		end
		total = total + 1
	end
	return MoveTestTask, { idx, total }
end


local MoveAgent = Class("Test.Task.MoveTest", require "agent/base/simpleagent")
MoveAgent._behaviors = {
	Position
}


local coord = nil

local function run()
	if coord == nil then
		local trainer = Trainer()
		local pools = { path = AgentPool(MoveAgent, #World.FriendlyRobotsAll) }
		local poolGroups = { { pools.path } }
		coord = Coordinator(trainer, pools, poolGroups)
	end
	coord:run()
end

Entrypoints.add("TaskTest/MoveTest", run)
