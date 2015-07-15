local Attacker = Class("Agent.Attacker", require "agent/base/agent")

local World = require "../base/world"

local ApplyForMainattacker = require "agent/attacker/applyformainattacker"
local Stop = require "agent/attacker/stop"
local KickoffOffensive = require "agent/attacker/kickoffoffensive"
local Penalty = require "agent/attacker/penalty"
local FreeKick = require "agent/attacker/freekick"
local Duel = require "agent/attacker/duel"
local Shoot = require "agent/attacker/shoot"
local KickoffAssistant = require "agent/attacker/kickoffassistant"
local Default = require "agent/attacker/default"
local KickoffDefensive = require "agent/attacker/kickoffdefensive"
local Armada = require "moves/armada/behavior"
local Messaging = require "control/messaging"
local Robot = require "observer/robot"
local debug = require "../base/debug"

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
