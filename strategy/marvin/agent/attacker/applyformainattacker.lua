local Base = require "agent/base/behavior"
local ApplyForMainattacker = Class("Agent.Attacker.ApplyForMainattacker", Base)

local debug = require "../base/debug"
local Referee = require "../base/referee"
local World = require "../base/world"
local Ball = require "observer/ball"
local Robot = require "observer/robot"


local cooldown = 3

function ApplyForMainattacker:_init()
	self._lastIncomingPassTime = 0
	self._lastIncomingPassSender = nil
end

function ApplyForMainattacker:_stop()
	self._lastShot = 0
	self._freekickFlag = false
end

function ApplyForMainattacker:check()
	-- track pass messages
	for sender, msg in pairs(self._inbox.passPos()) do
		if msg.robot == self._robot then
			self._lastIncomingPassTime = World.Time
			self._lastIncomingPassSender = sender
		else -- pass to other robot
			self._lastIncomingPassTime = 0
		end
	end

	if World.Time - self._lastShot < cooldown then
		for _, r in ipairs(World.Robots) do
			if r ~= self._robot and r.pos:distanceTo(World.Ball.pos) < World.Ball.radius + r.radius + 0.02 then
				self._lastShot = 0
			end
		end
		return false
	end

	-- cancel freekick
	if self._freekickFlag and Robot.hadBall(self._robot, 0.5)
			and not Referee.isFriendlyFreeKickState() then
		self._lastShot = World.Time
		self._freekickFlag = false
		return false
	end
	self._freekickFlag = Referee.isFriendlyFreeKickState()

	if Referee.isOpponentPenaltyState() then
		return false
	end
	
	local passTargetOverrideTime = 0.7
	if Ball.wasShot(passTargetOverrideTime) == self._lastIncomingPassSender and
			World.Time - self._lastIncomingPassTime < passTargetOverrideTime then
		self:_applyForMainAttacker(nil, nil, 2)
		self._agent.beOffensive = true
	else
		self:_applyForMainAttacker()
		self._agent.beOffensive = false
	end
	
	return false
end

function ApplyForMainattacker:_updateTask()
	error("This behavior is not supposed to run")
end

return ApplyForMainattacker
