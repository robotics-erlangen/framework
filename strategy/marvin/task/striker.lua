local SuggestPass = require "task/ability/suggestpass"
local CornerAttack = require "task/ability/cornerattack"
local Striker = Class("Task.Striker", require "task/base", SuggestPass, CornerAttack)
local StrikerLines = require "task/strikerlines"
local StrikerSampling = require "task/strikersampling"

local Constants = require "../base/constants"
local debug = require "../base/debug"
local Field = require "../base/field"
local geom = require "../base/geom"
local Processor = require "../base/processor"
local Referee = require "../base/referee"
local vis = require "../base/vis"
local World = require "../base/world"

local Messaging = require "control/messaging"
local RouletteWheelSelection = require "learning/roulettewheelselection"
local Ball = require "observer/ball"
local ObserverGame = require "observer/game"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local Interval = require "util/interval"

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

	local moveDest = self._generator:calcMoveDest()
	self:_suggestPass(moveDest)
	PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)
	if mainAttacker then
		self._robot.path:addCircle(mainAttacker.pos.x, mainAttacker.pos.y, 0.7, "mainattacker")
	end
	self._robot.trajectory:update(ToTarget, moveDest, (World.Ball.pos - self._robot.pos):angle())
	self._send.moveDest("all", moveDest)
end

return Striker
