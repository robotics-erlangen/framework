local Base = require "agent/base/behavior"
local ApplyForMainattacker = Class("Agent.Attacker.ApplyForMainattacker", Base)
local Referee = require "../base/referee"
local Ball = require "observer/ball"
local World = require "../base/world"
local debug = require "../base/debug"

local cooldown = 3

function ApplyForMainattacker:_stop()
	self._lastShot = 0
	self._freekickFlag = false
end

function ApplyForMainattacker:check()
	debug.set("ma application started", true)
	if World.Time - self._lastShot < cooldown then
		for _, r in ipairs(World.Robots) do
			if r ~= self._robot and r.pos:distanceTo(World.Ball.pos) < World.Ball.radius + r.radius + 0.02 then
				self._lastShot = 0
			end
		end
		return false
	end

	-- cancel freekick
	if self._freekickFlag and self._robot == Ball.friendlyBallOwner()
			and not Referee.isFriendlyFreeKickState() then
		self._lastShot = World.Time
		self._freekickFlag = false
		return false
	end
	self._freekickFlag = Referee.isFriendlyFreeKickState()

	if not Referee.isOpponentPenaltyState() then
		debug.set("ma application tried", true)
		self:_applyForMainAttacker()
	end
	return false
end

function ApplyForMainattacker:_updateTask()
	error("This behavior is not supposed to run")
end

return ApplyForMainattacker
