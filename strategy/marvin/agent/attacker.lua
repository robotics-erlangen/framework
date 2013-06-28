local Attacker = (require "../base/class").new("Agent.Attacker", require "agent/base/agent")
local World = require "../base/world"

local Group = require "agent/base/group"
local ReceivePass = require "agent/attacker/receivepass"
local KickoffAssistant = require "agent/attacker/kickoffassistant"
local AttackGroup = require "agent/attacker/attackgroup"
local Kickoff = require "agent/attacker/kickoff"
local Stop = require "agent/attacker/stop"
local Duel = require "agent/attacker/duel"
local Shoot = require "agent/attacker/shoot"
local Penalty = require "agent/attacker/penalty"
local FreeKick = require "agent/attacker/freekick"
local Default = require "agent/attacker/default"

function Attacker.takeRobot(robots)
	for _, robot in pairs(robots) do
		if robot.isVisible then
			return robot
		end
	end
end

function Attacker:keepRobot()
	return self._robot.isVisible and self._robot ~= World.FriendlyKeeper
end

-- worse rating if robot if farther away from opponent goal
function Attacker:rateRobot()
	return -World.Geometry.OpponentGoal:distanceTo(self._robot.pos)
end

function Attacker:_initBehaviour()
	self._behaviours = Group.create(self._robot, {
		ReceivePass.create(self._robot),
		AttackGroup.create(self._robot, {
			Stop.create(self._robot),
			Kickoff.create(self._robot),
			Penalty.create(self._robot),
			FreeKick.create(self._robot),
			Duel.create(self._robot),
			Shoot.create(self._robot)
		}),
		KickoffAssistant.create(self._robot),
		Default.create(self._robot)
	})
end

return Attacker
