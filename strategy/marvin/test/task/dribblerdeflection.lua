local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"

local AgentPool = require "control/agentpool"
local Coordinator = require "control/coordinator"
local Pass = require "task/pass"
local Trainer = require "trainer/trainer"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


local DRIBBLER_SPEED = 1

local obstacleTable = {
	ignorePass = true
}

local Position = Class("Test.Task.DribblerDeflection.Position", require "agent/base/behavior")
function Position:run()
	self._robot:setDribblerSpeed(DRIBBLER_SPEED)

	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	self._robot.trajectory:update(ToTarget, self._robot.pos, (World.Ball.pos - self._robot.pos):angle())
end

local ShooterBehaviour = Class("Test.Task.DribblerDeflection.ShooterBehaviour", require "agent/base/behavior")
function ShooterBehaviour:check()
	self._send.attackerFlag("all")
	local mainAttacker = self._inbox.mainAttacker().trainer
	if mainAttacker and false then
		log(tostring(self._robot).." "..tostring(self._inbox.mainAttacker()))
	end
	if not mainAttacker or mainAttacker == self._robot then
		self:_applyForMainAttacker()
		return true
	end
	return false
end

function ShooterBehaviour:_stop()
	self._framesSinceMove = 0
end

function ShooterBehaviour:_updateTask()
	if (World.Ball.speed:length() < 0.4 or self._robot.pos:distanceTo(World.Ball.pos) < 0.3)  and
			math.abs(World.Ball.pos.x) < World.Geometry.FieldWidthHalf and
			math.abs(World.Ball.pos.y) < World.Geometry.FieldHeightHalf then

		self._framesSinceMove = self._framesSinceMove + 1
		if self._framesSinceMove > 10 then
			local otherRobot = next(self._inbox.attackerFlag())
			return Pass, {otherRobot}
		end
	else
		self._framesSinceMove = 0
	end
	return Position, {}
end

local PositionBehaviour = Class("Test.Task.DribblerDeflection.PositionBehaviour", require "agent/base/behavior")
function PositionBehaviour:check()
	return true
end

function PositionBehaviour:_updateTask()
	return Position, {}
end

local DribblerDeflectionAgent = Class("Test.Task.DribblerDeflectionAgent", require "agent/base/simpleagent")
DribblerDeflectionAgent._behaviors = {
	ShooterBehaviour,
	PositionBehaviour
}

local coord = nil

local function run()
	if coord == nil then
		local trainer = Trainer()
		local pools = { pass = AgentPool(DribblerDeflectionAgent, 2) }
		local poolGroups = { { pools.pass } }
		coord = Coordinator(trainer, pools, poolGroups)
	end
	coord:run()
end

Entrypoints.add("TaskTest/DribblerDeflection", run)
