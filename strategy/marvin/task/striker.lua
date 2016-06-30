local SuggestPass = require "task/ability/suggestpass"
local CornerAttack = require "task/ability/cornerattack"
local Striker = Class("Task.Striker", require "task/base", SuggestPass, CornerAttack)
local StrikerLines = require "task/strikerlines"
local StrikerSampling = require "task/strikersampling"

local debug = require "../base/debug"
local Processor = require "../base/processor"
local Referee = require "../base/referee"
local World = require "../base/world"

local RouletteWheelSelection = require "learning/roulettewheelselection"
local Ball = require "observer/ball"
local Robot = require "observer/robot"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"

local StrikerSuccess = Class("Task.StrikerSuccess", require "../base/process")

function StrikerSuccess:init(n_options, action, receiver, attacker)
	self._n_options = n_options
	self._action = action
	self._receiver = receiver
	self._previousAttacker = attacker
	self._wasShot = false
	self._done = false
end

function StrikerSuccess:run()
	local shotBy = Ball.isShot()
	if shotBy then
		self._wasShot = true
		if shotBy ~= self._previousAttacker then
			self._done = true
			return
		end
	end
	local friendlyOwner = Ball.friendlyBallOwner()
	if friendlyOwner  == self._previousAttacker then
		return
	end
	local success = false
	if self._wasShot and friendlyOwner == self._receiver then
		success = true
		self._done = true
	elseif self._wasShot and (friendlyOwner or Ball.opponentBallOwner()) then
		success = false
		self._done = true
	end
	if self._done then
		RouletteWheelSelection.report("StrikerGenerators", self._n_options, self._action, success)
	end
end

function StrikerSuccess:isFinished()
	return self._done
end



Striker._generators = {
	StrikerLines,
	StrikerSampling
}

Striker._generatorNames = {
	"StrikerLines",
	"StrikerSampling"
}

function Striker:_init()
	self._decision = RouletteWheelSelection.decide("StrikerGenerators", #self._generators)
	self._generator = self._generators[self._decision](self._agent)
	self._successProcess = nil
	self._moveDest = nil
end

function Striker:run()
	if self._successProcess and self._successProcess:isFinished() then
		self._successProcess = nil
	end
	local mainAttacker = self._inbox.mainAttacker().trainer
	if (not self._successProcess) and mainAttacker then
		self._successProcess = StrikerSuccess(#self._generators, self._decision, self._robot, mainAttacker)
		Processor.addPost(self._successProcess)
	end

	if Referee.isOffensiveCornerKick() then
		if self:_tryCornerAttack() then
			return -- a cornerAttack is performed
		end
	end

	if not self._inbox.attackerFlag("broadcast")[self._robot] then
		return -- we're not considered at position choice
	end
	debug.set("StrikerGenerator", self._generatorNames[self._decision])
	local _, shootPlan = next(self._inbox.shootActionPlan())
	local lockMoveDest = mainAttacker and (Ball.receivesPass(mainAttacker)
		and World.Ball.pos:distanceTo(mainAttacker.pos) < 1.5
		or Robot.hadBall(mainAttacker, 0.1))
		and not next(self._inbox.defendedOpponent())
		and shootPlan == "pass"

	if not self._moveDest or not lockMoveDest then
		self._moveDest = self._generator:calcMoveDest()
	end

	self:_suggestPass(self._moveDest)
	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)
	if mainAttacker then
		self._robot.path:addCircle(mainAttacker.pos.x, mainAttacker.pos.y, 0.7, "mainattacker")
	end

	-- don't drive into our own pass path, but receiving it is ok
	local _, shootDest = next(self._inbox.shootDestination())
	local _, passPos = next(self._inbox.passPos())
	local isPassReceiver = (passPos and passPos.robot == self._robot)
	if shootDest and not isPassReceiver then
		self._robot.path:addLine(World.Ball.pos.x, World.Ball.pos.y, shootDest.x, shootDest.y, self._robot.radius)
	end

	-- block path between ball and mainAttacker, this prevents blocking a shot
	if mainAttacker then
		self._robot.path:addLine(World.Ball.pos.x, World.Ball.pos.y, mainAttacker.pos.x, mainAttacker.pos.y, self._robot.radius)
	end

	self._robot.trajectory:update(ToTarget, self._moveDest, (World.Ball.pos - self._robot.pos):angle())
	self._send.moveDest("all", self._moveDest)
end

return Striker
