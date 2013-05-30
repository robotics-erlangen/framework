local Attacker = (require "../base/class").new("Agent.Attacker", require "agent/base/agent")
local World = require "../base/world"

local Group = require "agent/base/group"
local ReceivePass = require "agent/attacker/receivepass"
local AttackGroup = require "agent/attacker/attackgroup"
local DefaultStop = require "agent/attacker/defaultstop"
local DefaultDuel = require "agent/attacker/defaultduel"
local DefaultShoot = require "agent/attacker/defaultshoot"
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
			DefaultDuel.create(self._robot),
			DefaultShoot.create(self._robot)
		}),
		Default.create(self._robot)
	})
end

return Attacker
