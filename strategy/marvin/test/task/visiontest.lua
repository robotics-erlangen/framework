local Entrypoints = require "../base/entrypoints"
local plot = require "../base/plot"
local World = require "../base/world"
local AgentPool = require "control/agentpool"
local Coordinator = require "control/coordinator"
local Trainer = require "trainer/trainer"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


local CENTER_DIST = 7.8
local START_ANGLE = 90/180*math.pi
local ANGLE_STEP = 360/180*math.pi
local WAIT_TIME = 3
local ROBOT_ORIENTATION = 90/180*math.pi
local ROBOT_ORIENTATION_STEP = 0/180*math.pi
local POS_LIST = { Vector(-1.8, 3.9), Vector(0, 3.9), Vector(0, -3.9), Vector(1.8, -3.9), Vector(1.8, 3.9), Vector(-1.8, -3.9) }

local obstacleTable = {
	ignoreBall = true,
	ignorePass = true,
	ignoreDefenseArea = true,
	ignoreOpponentDefenseArea = true
}

local function indexCalculation(inbox, robotId)
	local idx = 0
	local total = 0
	for robot, _ in pairs(inbox.attackerFlag("broadcast")) do
		if robotId > robot.id then
			idx = idx + 1
		end
		total = total + 1
	end
	return idx, total
end

local VisionTestTask = Class("Test.Task.VisionTest.Task", require "task/base")
function VisionTestTask:_init()
	self._dest = nil
	self._atTargetSince = nil
	self._startPos = POS_LIST[1]
	self._centerDist = CENTER_DIST
	self._angle = START_ANGLE
	self._angleStep = ANGLE_STEP
	self._robotOrientation = ROBOT_ORIENTATION
	self._robbotOrientationStep = ROBOT_ORIENTATION_STEP
	self._orientation = ROBOT_ORIENTATION
	self._robotState = 0
end

function VisionTestTask:run()
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)

	local idx, total = indexCalculation(self._inbox, self._robot.id)
	local offset = Vector((idx - total/2) * 0.25, 0)

	local pos
	if self._dest then
		pos = self._dest + offset
	else
		pos = self._startPos + offset
	end
	local dir = self._orientation

	local targetDist = self._robot.pos:distanceTo(pos)
	--log(targetDist)
	if targetDist < 0.2 and self._atTargetSince == nil then
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
			self._startPos = POS_LIST[self._robotState+1]
			self._robotState = (self._robotState + 1) % #POS_LIST
		end
		self._orientation = self._orientation + ROBOT_ORIENTATION_STEP
	end

	plot.addPlot("positionError." .. tostring(self._robot.id), self._robot.pos:distanceTo(pos))
	self._robot.trajectory:update(ToTarget, pos, dir, 1)
end


local Position = Class("Test.Task.VisionTest.Behavior", require "agent/base/behavior")
function Position:check()
	self._send.attackerFlag("all")
	-- also receive own message
	return next(self._inbox.attackerFlag("broadcast")) ~= nil
end

function Position:_updateTask()
	return VisionTestTask, {}
end


local MoveAgent = Class("Test.Task.VisionTest", require "agent/base/simpleagent")
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

Entrypoints.add("TaskTest/VisionTest", run)
