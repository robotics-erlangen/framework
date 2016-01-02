local debug = require "../base/debug"
local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"
local ApplyForMainattacker = require "agent/attacker/applyformainattacker"
local AgentPool = require "control/agentpool"
local Coordinator = require "control/coordinator"
local Ball = require "observer/ball"
local MoveToPos = require "task/movetopos"
local Pass = require "task/pass"
local Trainer = require "trainer/trainer"


local lastShotBy = nil

--The Lines the robots will return to
local returnLines = {-1,1}
--How far from the receiving Robot the shot will be aimed at
local shotDistance = 1

local Static = Class("Test.Task.LinePassing.Static", require "agent/base/behavior")
function Static:check()
  debug.set("linepass: lasthad", lastShotBy)
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
  local idx = 2
	for robot, _ in pairs(self._inbox.attackerFlag()) do
		if self._robot.id > robot.id then
			idx = idx - 1
		end
	end
  local projectedPos = Vector(returnLines[idx],otherRobot.pos.y)
  local passPos = projectedPos+Vector(0,-shotDistance*math.sign(otherRobot.pos.y))
	return Pass, { otherRobot, passPos }
end



local Position = Class("Test.Task.LinePassing.Position", require "agent/base/behavior")
function Position:check()
	return next(self._inbox.attackerFlag()) ~= nil
end

function Position:_updateTask()
  local idx = 1
	for robot, _ in pairs(self._inbox.attackerFlag()) do
		if self._robot.id > robot.id then
			idx = idx + 1
		end
	end
	local pos = Vector(returnLines[idx],0.1) --the robot should not be on exactly 0 for y
	return MoveToPos, { pos, (-pos):angle() }
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
