local debug = require "../base/debug"
local Entrypoints = require "../base/entrypoints"
local Vector = require "../base/vector"
local World = require "../base/world"
local ApplyForMainattacker = require "agent/attacker/applyformainattacker"
local AgentPool = require "control/agentpool"
local Coordinator = require "control/coordinator"
local Ball = require "observer/ball"
local Physics = require "observer/physics"
local MoveToPos = require "task/movetopos"
local Pass = require "task/pass"
local Trainer = require "trainer/trainer"

--For now, linepassing will only work properly when all robots of the other team are disabled

local lastShotBy = nil
local lastHad = 2

--The Lines the robots will return to
local returnLines = {1.5,-1.5}
--How far from the receiving Robot the shot will be aimed at
local shotDistance = 0.7

local Static = Class("Test.Task.LinePassing.Static", require "agent/base/behavior")
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



local Passer = Class("Test.Task.LinePassing.Pass", require "agent/base/behavior")
function Passer:check()
	local otherRobot = next(self._inbox.attackerFlag())
	return self._inbox.mainAttacker().trainer == self._robot and otherRobot
end


function Passer:_updateTask()
	local otherRobot = next(self._inbox.attackerFlag())
	return Pass, { otherRobot}
end

function sign(x)
  return (x<0 and -1) or 1
end

local Position = Class("Test.Task.LinePassing.Position", require "agent/base/behavior")
function Position:_stop()
	self._alreadyReturned = false
	self._newPosition = math.random(-World.Geometry.FieldHeight*0.3,World.Geometry.FieldHeight*0.3)
	local dif = self._newPosition-self._robot.pos.y
	if math.abs(dif) > 2 then
		self._newPosition = self._newPosition-sign(dif)*math.max(0,math.abs(dif)-2)
	end
end

function Position:check()
	return next(self._inbox.attackerFlag()) ~= nil
end

function Position:_updateTask()
	local otherRobot = next(self._inbox.attackerFlag())
  local idx = 1
	for robot, _ in pairs(self._inbox.attackerFlag()) do
		if self._robot.id > robot.id then
			idx = idx + 1
		end
	end
	lastHad = idx
	local mainAttacker = self._inbox.mainAttacker().trainer

	local posTo = Vector(returnLines[idx],self._robot.pos.y)
	local passPos = Vector(returnLines[idx],self._newPosition)
	
	local timeOnPass = Physics.robotTimeToPos(self._robot, posTo,
				(posTo - self._robot.pos):setLength(self._robot.maxSpeed))
	local ballTime = mainAttacker.pos:distanceTo(World.Ball.pos)
	local timeOnPos = Physics.robotTimeToPos(self._robot, passPos,
			(passPos - self._robot.pos):setLength(self._robot.maxSpeed)) + World.Time

	if (posTo - self._robot.pos):length() < 0.1 then
		self._alreadyReturned = true
	end
	if self._alreadyReturned == false then
		self._send.passSuggestion(mainAttacker,{ rating = math.huge, pos = passPos, time = math.huge })
	else
		self._send.passSuggestion(mainAttacker,{ rating = math.huge, pos = passPos, time = timeOnPos })
	end
	return MoveToPos, { posTo, (-posTo):angle() }
end


local LinePassAgent = Class("Test.Task.LinePassAgent", require "agent/base/simpleagent")
LinePassAgent._behaviors = {
	Static,
	Passer,
	Position
}

local coord = nil

local function run()
	if coord == nil then
		local trainer = Trainer()
		local pools = { pass = AgentPool(LinePassAgent, 2) }
		local poolGroups = { { pools.pass } }
		coord = Coordinator(trainer, pools, poolGroups)
	end
	coord:run()
end

Entrypoints.add("TaskTest/LinePassing", run)
