local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"
local ApplyForMainattacker = require "agent/attacker/applyformainattacker"
local AgentPool = require "control/agentpool"
local Coordinator = require "control/coordinator"
local MoveToPos = require "task/movetopos"
local Pass = require "task/pass"
local Trainer = require "trainer/trainer"


local Static = Class("Test.Task.Passing.Static", require "agent/base/behavior")
function Static:check()
	self._send.attackerFlag("all")
	return false
end



local Passer = Class("Test.Task.Passing.Pass", require "agent/base/behavior")
function Passer:check()
	local otherRobot = next(self._inbox.attackerFlag())
	return self._inbox.mainAttacker().trainer == self._robot and otherRobot
end

function Passer:_updateTask()
	local otherRobot = next(self._inbox.attackerFlag())
	return Pass, { otherRobot }
end



local Position = Class("Test.Task.Passing.Position", require "agent/base/behavior")
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
	local pos = Vector(idx * 3 - 1.5, 0)
	return MoveToPos, { pos, (-pos):angle() }
end



local PassAgent = Class("Test.Task.PassAgent", require "agent/base/simpleagent")
PassAgent._behaviors = {
	Static,
	ApplyForMainattacker,
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

Entrypoints.add("TaskTest/Passing", run)
