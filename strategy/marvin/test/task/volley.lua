local Entrypoints = require "../base/entrypoints"
local Field = require "../base/field"
local Processor = require "../base/processor"
local Referee = require "../base/referee"
local World = require "../base/world"
local ApplyForMainattacker = require "agent/attacker/applyformainattacker"
local AgentPool = require "control/agentpool"
local Coordinator = require "control/coordinator"
local Ball = require "observer/ball"
local Robot = require "observer/robot"
local Volley = require "task/ability/volley"
local MoveToPos = require "task/movetopos"
local Pass = require "task/pass"
local ShootGoal = require "task/shootgoal"
local Trainer = require "trainer/trainer"

local Static = Class("Test.Task.Volley.Static", require "agent/base/behavior")
function Static:check()
	self._send.attackerFlag("all")
	return false
end



local VolleyProcess = Class("Tesk.Task.Volley.VolleyProcess", require "../base/process")
function VolleyProcess:init(robot)
	self._isFinished = false
	self._ballSpeed = nil
	self._viewPos = nil
	self._targetPos = nil
	self._expectedTargetSpeed = nil
	self._hadBall = false
	self._robot = robot
end

function VolleyProcess:run()
	-- abort if another robot touches the ball or the ball has nearly stopped
	if World.Ball.speed:length() < 1 or (Ball.friendlyBallOwner() ~= nil and Ball.friendlyBallOwner() ~= self._robot) or Ball.opponentBallOwner() then
		self._isFinished = true
		return
	end

	if not self._hadBall and Robot.touchedBall(self._robot, 0) then
		log("hadBall")
		self._hadBall = true
	end
	-- If ball has traveled the target distance or left the field
	if self._hadBall
			and (World.Ball.pos:distanceTo(self._viewPos) > self._targetPos:distanceTo(self._viewPos)
			or not Field.isInField(World.Ball.pos)) then
		local dirError = (World.Ball.pos - self._viewPos):angleDiff(self._targetPos - self._viewPos)
		local speedError = World.Ball.speed:length() - self._expectedTargetSpeed
		local volleyAngle = self._ballSpeed:angleDiff(self._targetPos - self._viewPos)/math.pi*180

		local lowError = 1.5/180*math.pi
		local lowSpeedError = 0.5
		local mu_x, mu_y = Volley.getParams()
		log(string.format("Old volley params %f %f", mu_x, mu_y))
		log(string.format("Volley angle %f", volleyAngle))
		if math.abs(dirError) > lowError then
			mu_x = mu_x + 0.01 * math.sign(volleyAngle) * math.sign(dirError)
		elseif math.abs(speedError) > lowSpeedError then
			mu_x = mu_x + 0.01 * math.sign(speedError)
			mu_y = mu_y + 0.01 * math.sign(speedError)
		else
			-- do nothing
		end
		Volley.setParams(mu_x, mu_y)
		log(string.format("dirError %f speedError %f", dirError/math.pi*180, speedError))
		log(string.format("Updated volley params %f %f", mu_x, mu_y))
		self._isFinished = true
	end
end

function VolleyProcess:isFinished()
	return self._isFinished
end

function VolleyProcess:setData(ballSpeed, viewPos, targetPos, expectedTargetSpeed)
	-- only update parameters until the ball touched the robot
	if self._hadBall then
		return
	end
	self._ballSpeed = ballSpeed
	self._viewPos = viewPos
	self._targetPos = targetPos
	self._expectedTargetSpeed = expectedTargetSpeed
	--log(string.format("Data %s %s %s %f", ballSpeed, viewPos, targetPos, expectedTargetSpeed))
end


local ModShootGoal = Class("Test.Task.Volley.ModShootGoalTask", ShootGoal)
function ModShootGoal:_init(...)
	ShootGoal._init(self, ...)
	self._analysisProcess = nil
end

function ModShootGoal:run()
	if self._analysisProcess ~= nil and self._analysisProcess:isFinished() then
		self._analysisProcess = nil
	end
	if self._analysisProcess == nil then
		self._analysisProcess = VolleyProcess(self._robot)
		Processor.addPost(self._analysisProcess)
	end

	self._volleyObserver = function(...)
		self._analysisProcess:setData(...)
	end

	ShootGoal.run(self)
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
	return ModShootGoal
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
	return Pass, {targetRobot, nil, true}
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
