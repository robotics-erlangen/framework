local Entrypoints = require "../base/entrypoints"
local plot = require "../base/plot"
local World = require "../base/world"
local AgentPool = require "control/agentpool"
local Coordinator = require "control/coordinator"
local Trainer = require "trainer/trainer"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


local START_POS = Vector(-1.8, -3.9)
local CENTER_DIST = 7.8
local START_ANGLE = 90/180*math.pi
local ANGLE_STEP = 360/180*math.pi
local WAIT_TIME = 3
local ROBOT_ORIENTATION = 90/180*math.pi
local ROBOT_ORIENTATION_STEP = 0/180*math.pi
local STATE = 0


local VisionTestTask = Class("Test.Task.VisionTest.Task", require "task/base")
function VisionTestTask:_init(idx, total)
	self._dest = nil
	self._atTargetSince = nil
	self._startPos = START_POS
	self._centerDist = CENTER_DIST
	self._angle = START_ANGLE
	self._angleStep = ANGLE_STEP
	self._robotOrientation = ROBOT_ORIENTATION
	self._robbotOrientationStep = ROBOT_ORIENTATION_STEP
	self._orientation = ROBOT_ORIENTATION
	self._robotState = STATE
	-- line up robots
	self._startPos = START_POS + Vector((idx - total/2) * 0.25, 0)
	self._myTotal = total
	self._myIdx = idx
end

function VisionTestTask:run()
	PathHelper.setDefaultObstacles(self._robot.path, self._robot,true , false, true, nil, nil, nil, true)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)
	local pos
	if self._dest then
		pos = self._dest
	else
		pos = self._startPos
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
			if self._robotState == 0 then
				self._robotState = 1
				self._startPos = Vector(-1.8, 3.9)+ Vector((self._myIdx - self._myTotal/2) * 0.25, 0)
			elseif self._robotState == 1 then
				self._robotState = 2
				self._startPos = Vector(0, 3.9)+ Vector((self._myIdx - self._myTotal/2) * 0.25, 0)
			elseif self._robotState == 2 then
				self._robotState = 3
				self._startPos = Vector(0, -3.9)+ Vector((self._myIdx - self._myTotal/2) * 0.25, 0)
			elseif self._robotState == 3 then
				self._robotState = 4
				self._startPos = Vector(1.8, -3.9)+ Vector((self._myIdx - self._myTotal/2) * 0.25, 0)
			elseif self._robotState == 4 then
				self._robotState = 5
				self._startPos = Vector(1.8, 3.9)+ Vector((self._myIdx - self._myTotal/2) * 0.25, 0)
			elseif self._robotState == 5 then
				self._robotState = 0
				self._startPos = Vector(-1.8, -3.9)+ Vector((self._myIdx - self._myTotal/2) * 0.25, 0)
			end
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
	local idx = 0
	local total = 0
	for robot, _ in pairs(self._inbox.attackerFlag()) do
		if self._robot.id > robot.id then
			idx = idx + 1
		end
		total = total + 1
	end
	return VisionTestTask, { idx, total }
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
