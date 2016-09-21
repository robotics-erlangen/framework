local Entrypoints = require "../base/entrypoints"
local Vector = require "../base/vector"
local World = require "../base/world"
local AgentPool = require "control/agentpool"
local Coordinator = require "control/coordinator"
local Ball = require "observer/ball"
local Physics = require "observer/physics"
local Pass = require "task/pass"
local Trainer = require "trainer/trainer"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"

--The x coordinates of the lines the robots will return to
local RETURN_LINES = {1.5,-1.5}

--For now, linepassing will only work properly when all robots of the other team are disabled
local lastShotBy = nil

-- whether or not to do regular linpassing or a catch ball test
local catchBallTest = false

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
	return Pass, { otherRobot }
end



local MoveToRandom = Class("Test.Task.LinePassing.MoveToRandom", require "task/base")
function MoveToRandom:_init()
	self._ypos = (math.random() - 0.5) * 2 * (World.Geometry.FieldHeightHalf - 1)
end

function MoveToRandom:run()
	-- get the robot index
	local idx = 1
	for robot, _ in pairs(self._inbox.attackerFlag()) do
		if self._robot.id > robot.id then
			idx = idx + 1
		end
	end
	local mainAttacker = self._inbox.mainAttacker().trainer

	-- position where the robot wants the ball
	local passPos = Vector(RETURN_LINES[idx], self._ypos)
	local timeOnPos = Physics.robotTimeToPos(self._robot, passPos,
			(passPos - self._robot.pos):setLength(self._robot.maxSpeed)) + World.Time

	-- move to pass pos
	local targetPos = passPos
	local linePos = Vector(RETURN_LINES[idx], self._robot.pos.y)
	if linePos:distanceTo(self._robot.pos) > 0.3
			-- only move if the attacker is near the ball, this ensures that we still move when the attacker gets to the ball
			or mainAttacker and mainAttacker.pos:distanceTo(World.Ball.pos) > 0.5 then
		-- return to line before wanting a pass
		timeOnPos = math.huge
		targetPos = linePos
	end

	-- notify attacker
	if mainAttacker then
		local modifiedPos = passPos
		if catchBallTest then
			modifiedPos = targetPos - Vector(0,math.sign(targetPos.y)*0.5)
		end
		self._send.passSuggestion(mainAttacker, { rating = math.huge, pos = modifiedPos, time = timeOnPos })
	end

	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)

	self._robot.trajectory:update(ToTarget, targetPos, (-targetPos):angle())
end


local Position = Class("Test.Task.LinePassing.Position", require "agent/base/behavior")
function Position:check()
	local otherRobot = next(self._inbox.attackerFlag())
	return otherRobot
end

function Position:_updateTask()
	return MoveToRandom, {}
end



local LinePassAgent = Class("Test.Task.LinePassAgent", require "agent/base/simpleagent")
LinePassAgent._behaviors = {
	Static,
	Passer,
	Position
}

local coord = nil

local function run()
	catchBallTest = false
	if coord == nil then
		local trainer = Trainer()
		local pools = { pass = AgentPool(LinePassAgent, 2) }
		local poolGroups = { { pools.pass } }
		coord = Coordinator(trainer, pools, poolGroups)
	end
	coord:run()
end

local function runCatchBall()
	catchBallTest = true
	if coord == nil then
		local trainer = Trainer()
		local pools = { pass = AgentPool(LinePassAgent, 2) }
		local poolGroups = { { pools.pass } }
		coord = Coordinator(trainer, pools, poolGroups)
	end
	coord:run()
end

Entrypoints.add("TaskTest/LinePassing", run)
Entrypoints.add("TaskTest/LinePassing(CatchBall)", runCatchBall)
