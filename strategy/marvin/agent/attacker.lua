local Attacker = (require "../base/class").new("Agent.Attacker", require "agent/base/agent")
local World = require "../base/world"

local Group = require "agent/base/group"
local ReceivePass = require "agent/attacker/receivepass"
local KickoffAssistant = require "agent/attacker/kickoffassistant"
local AttackGroup = require "agent/attacker/attackgroup"
local Kickoff = require "agent/attacker/kickoff"
local DefaultStop = require "agent/attacker/defaultstop"
local DefaultDuel = require "agent/attacker/defaultduel"
local DefaultShoot = require "agent/attacker/defaultshoot"
local DefaultPenalty = require "agent/attacker/defaultpenalty"
local DefaultFreeKick = require "agent/attacker/defaultfreekick"
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

function Attacker:_initBehaviour()
	self._behaviours = Group.create(self._robot, {
		ReceivePass.create(self._robot),
		AttackGroup.create(self._robot, {
			DefaultStop.create(self._robot),
			Kickoff.create(self._robot),
			DefaultPenalty.create(self._robot),
			DefaultFreeKick.create(self._robot),
			DefaultDuel.create(self._robot),
			DefaultShoot.create(self._robot)
		}),
		KickoffAssistant.create(self._robot),
		Default.create(self._robot)
	})
end

return Attacker
