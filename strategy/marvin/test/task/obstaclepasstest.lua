local Entrypoints = require "../base/entrypoints"
local Vector = require "../base/vector"
local World = require "../base/world"
local AgentPool = require "control/agentpool"
local Coordinator = require "control/coordinator"
local Ball = require "observer/ball"
local MoveToPos = require "task/movetopos"
local Pass = require "task/pass"
local Striker = require "task/striker"
local Trainer = require "trainer/trainer"


local lastShotBy = nil

local Static = Class("Test.Task.ObstaclePassing.Static", require "agent/base/behavior")
function Static:check()
	self._send.attackerFlag("all")
	local lastRobot = Ball.isShot()
	if lastRobot then
		lastShotBy = lastRobot
	end
	if self._robot ~= lastShotBy then
		self:_applyForMainAttacker()
	end
	return false
end



local Passer = Class("Test.Task.ObstaclePassing.Pass", require "agent/base/behavior")
function Passer:check()
	local otherRobot = next(self._inbox.attackerFlag())
	return self._inbox.mainAttacker().trainer == self._robot and otherRobot
end


function Passer:_updateTask()
	local otherRobot = next(self._inbox.attackerFlag())
	return Pass, { otherRobot }
end


local Position = Class("Test.Task.ObstaclePassing.Position", require "agent/base/behavior")
function Position:check()
	local otherRobot = next(self._inbox.attackerFlag())
	return otherRobot
end

function Position:_updateTask()
	return Striker, {}
end

local ObstaclePassAgent = Class("Test.Task.ObstaclePassAgent", require "agent/base/simpleagent")
ObstaclePassAgent._behaviors = {
	Static,
	Passer,
	Position
}

local RETURN_LINES = {1.5,-1.5}

local DriveToRandom = Class("Test.Task.ObstaclePassing.DriveToRandom", require "agent/base/behavior")
function DriveToRandom:_stop()
	self._randomPos = Vector((math.random()-0.5)* 2 * (RETURN_LINES[1]-0.2),
							(math.random()-0.5) * 2 * (World.Geometry.FieldHeightHalf-1))
end

function DriveToRandom:check()
	return true
end


function DriveToRandom:_updateTask()
	return MoveToPos, { self._randomPos, (-self._randomPos):angle() }
end

local RandomPosAgent = Class("Test.Task.RandomPosAgent", require "agent/base/simpleagent")
RandomPosAgent._behaviors = {
	DriveToRandom
}

local coord = nil

local function run()
	if coord == nil then
		local trainer = Trainer()
		local pools = nil
		if World.TeamIsBlue then
			-- these robots do the passing
			pools = { pass = AgentPool(ObstaclePassAgent, 2) }
		else
			-- just position the robots randomly
			pools = { pass = AgentPool(RandomPosAgent, 4) }
		end
		local poolGroups = { { pools.pass } }
		coord = Coordinator(trainer, pools, poolGroups)
	end
	coord:run()
end

Entrypoints.add("TaskTest/ObstaclePassing", run)
