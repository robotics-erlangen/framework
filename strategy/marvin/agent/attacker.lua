local Base = require "agent/base/agent"
local Attacker = Class("Agent.Attacker", Base)

local World = require "../base/world"
local debug = require "../base/debug"

local ApplyForMainattacker = require "agent/attacker/applyformainattacker"
local Default = require "agent/attacker/default"
local Duel = require "agent/attacker/duel"
local FreeKick = require "agent/attacker/freekick"
local Move = require "agent/attacker/move"
local Penalty = require "agent/attacker/penalty"
local Shoot = require "agent/attacker/shoot"
local Stop = require "agent/attacker/stop"
local BallEscort = require "agent/shared/ballescort"
local DoubleTouchGuard = require "agent/attacker/doubletouchguard"

Attacker._behaviors = {
	ApplyForMainattacker,
	Move,
	Stop,
	Penalty,
	FreeKick,
	DoubleTouchGuard,
	Duel,
	BallEscort,
	Shoot,
	Default
}

function Attacker:init(robot, messaging)
	Base.init(self, robot, messaging)
	self.beOffensive = false
end

function Attacker:_run()
	if self._activeBehavior then
		assert(self._activeBehavior._send, "behavior message interface changed")
		self._activeBehavior._send.attackerFlag("all")

		local groupApplication = { name = "moves", payload = {} }
		self._activeBehavior._send.groupApplication("trainer", groupApplication)
	end

	debug.set("pool rating", self:rateRobot())
end

function Attacker.takeRobot(robots)
	for _, robot in ipairs(robots) do
		if robot.isVisible then
			return robot
		end
	end
end

function Attacker:keepRobot()
	return self._robot.isVisible and self._robot ~= World.FriendlyKeeper and not self._robot.userControl
end

-- worse rating if robot is farther away from opponent goal
function Attacker:rateRobot()
	if self._activeBehavior and self._activeBehavior:forceKeepingInPool()  then
		return math.huge
	end
	return -World.Geometry.OpponentGoal:distanceTo(self._robot.pos)
end

return Attacker
