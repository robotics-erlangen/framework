local Entrypoints = require "../base/entrypoints"
local Referee = require "../base/referee"
local World = require "../base/world"
local ApplyForMainattacker = require "agent/attacker/applyformainattacker"
local AgentPool = require "control/agentpool"
local Coordinator = require "control/coordinator"
local Ball = require "observer/ball"
local MoveToPos = require "task/movetopos"
local Pass = require "task/pass"
local ShootGoal = require "task/shootgoal"
local Trainer = require "trainer/trainer"

local Static = Class("Test.Task.Volley.Static", require "agent/base/behavior")
function Static:check()
	self._send.attackerFlag("all")
	return false
end


local Shooter = Class("Test.Task.Volley.Shooter", require "agent/base/behavior")
function Shooter:_stop()
	self.lastPassReceiptTime = 0
end

function Shooter:check()
	if not next(self._inbox.attackerFlag()) then
		return false
	end

	if self._inbox.mainAttacker().trainer ~= self._robot then
		return false
	end

	if Ball.receivesPass(self._robot) then
		self.lastPassReceiptTime = World.Time
	end
	return World.Time - self.lastPassReceiptTime < 0.2
end

function Shooter:_updateTask()
	return ShootGoal
end


local Passer = Class("Test.Task.Volley.Passer", require "agent/base/behavior")
function Passer:check()
	if not next(self._inbox.attackerFlag()) then
		return false
	end

	if self._inbox.mainAttacker().trainer ~= self._robot then
		return false
	end

	return Referee.isFriendlyFreeKickState()
end

function Passer:_updateTask()
	local targetRobot = next(self._inbox.attackerFlag())
	return Pass, {targetRobot}
end


local Position = Class("Test.Task.Volley.Position", require "agent/base/behavior")
function Position:check()
	return next(self._inbox.attackerFlag()) ~= nil
end

function Position:_updateTask()
	local idx = 0
	for robot, _ in pairs(self._inbox.attackerFlag()) do
		if self._robot.id > robot.id then
			idx = idx + 1
		end
	end
	local x = World.Geometry.FieldWidthHalf * 2 / 3
	local y = World.Geometry.FieldHeightHalf * 1 / 4
	local pos = Vector((idx * 2 - 1) * x, y)
	return MoveToPos, { pos, (World.Geometry.OpponentGoal - pos):angle() }
end


local PassAgent = Class("Test.Task.VolleyAgent", require "agent/base/simpleagent")
PassAgent._behaviors = {
	Static,
	ApplyForMainattacker,
	Shooter,
	Passer,
	Position
}

local coord = nil

local function run()
	if coord == nil then
		local trainer = Trainer()
		local pools = { pass = AgentPool(PassAgent, 2) }
		local poolGroups = { { pools.pass } }
		coord = Coordinator(trainer, pools, poolGroups)
	end
	coord:run()
end

Entrypoints.add("TaskTest/Volley", run)
