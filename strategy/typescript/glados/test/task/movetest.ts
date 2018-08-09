local Entrypoints = require "../base/entrypoints"
local plot = require "../base/plot"
local World = require "../base/world"
local AgentPool = require "control/agentpool"
local Coordinator = require "control/coordinator"
local Trainer = require "trainer/trainer"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


local START_POS = Vector(0, 0.5)
local CENTER_DIST = 1.3
local START_ANGLE = 60/180*math.pi
local ANGLE_STEP = 360/180*math.pi
local WAIT_TIME = 3
local ROBOT_ORIENTATION = 0/180*math.pi
local ROBOT_ORIENTATION_STEP = 300/180*math.pi

local obstacleTable = {
	ignorePass = true
}

local MoveTestTask = Class("Test.Task.MoveTest.Task", require "task/base")
function MoveTestTask:_init(idx, total)
	self._dest = nil
	self._atTargetSince = nil
	self._angle = START_ANGLE
	self._orientation = ROBOT_ORIENTATION
	-- line up robots
	self._startPos = START_POS + Vector((idx - total/2) * 0.5, 0)
end

function MoveTestTask:run()
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)

	local pos
	if self._dest then
		pos = self._dest
	else
		pos = self._startPos
	end
	local dir = self._orientation

	local targetDist = self._robot.pos:distanceTo(pos)
	if targetDist < 0.05 and self._atTargetSince == nil then
		self._atTargetSince = World.Time
	elseif targetDist > 0.01 then
		self._atTargetSince = nil
	end
	local synchronized = false
	if self._atTargetSince and World.Time - self._atTargetSince > WAIT_TIME then
		self._send.defenderFlag("all")
		synchronized = (table.count(self._inbox.attackerFlag("broadcast")) - table.count(self._inbox.defenderFlag("broadcast"))) == 0
	end
	if synchronized then
		if self._dest then
			self._dest = nil
		else
			self._dest = self._startPos + Vector.fromAngle(self._angle):scaleLength(CENTER_DIST)
			self._angle = self._angle + ANGLE_STEP
		end
		self._orientation = self._orientation + ROBOT_ORIENTATION_STEP
	end

	plot.addPlot("positionError." .. tostring(self._robot.id), self._robot.pos:distanceTo(pos))
	self._robot.trajectory:update(ToTarget, pos, dir)
end


local Position = Class("Test.Task.MoveTest.Behavior", require "agent/base/behavior")
function Position:check()
	self._send.attackerFlag("all")
	-- also receive own message
	return next(self._inbox.attackerFlag("broadcast")) ~= nil
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
