local Base = require "agent/base/agent"
local Attacker = Class("Agent.Attacker", Base)

local World = require "../base/world"
local debug = require "../base/debug"

local ApplyForMainattacker = require "agent/attacker/applyformainattacker"
local Default = require "agent/attacker/default"
local Duel = require "agent/attacker/duel"
local FreeKick = require "agent/attacker/freekick"
local KickoffAssistant = require "agent/attacker/kickoffassistant"
local KickoffDefensive = require "agent/attacker/kickoffdefensive"
local KickoffOffensive = require "agent/attacker/kickoffoffensive"
local Penalty = require "agent/attacker/penalty"
local Shoot = require "agent/attacker/shoot"
local Stop = require "agent/attacker/stop"

local Messaging = require "control/messaging"
local Armada = require "moves/armada/behavior"
local Robot = require "observer/robot"


Attacker._behaviors = {
	ApplyForMainattacker,
	Armada,
	Stop,
	KickoffOffensive,
	KickoffDefensive,
	Penalty,
	FreeKick,
	Duel,
	Shoot,
	KickoffAssistant,
	Default
}

function Attacker:_run()
	if self._activeBehavior then
		assert(self._activeBehavior._send, "behavior message interface changed")
		self._activeBehavior._send.attackerFlag("all")
	end
	debug.set("pool rating", self:rateRobot())
end

function Attacker.takeRobot(robots)
	for _, robot in pairs(robots) do
		if robot.isVisible then
			return robot
		end
	end
end

function Attacker:keepRobot()
	return self._robot.isVisible and self._robot ~= World.FriendlyKeeper and not self._robot.userControl
end

-- worse rating if robot if farther away from opponent goal
function Attacker:rateRobot()
	if self._activeBehavior and self._activeBehavior:forceKeepingInPool()  then
		return math.huge
	end
	return -World.Geometry.OpponentGoal:distanceTo(self._robot.pos)
end

return Attacker
