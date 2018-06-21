local Base = require "agent/base/behavior"
local Default = Class("Agent.Attacker.Default", Base)

local AcceptPass = require "task/attacker/acceptpass"
local Midfield = require "task/attacker/midfield"
local SideStep = require "task/attacker/sidestep"
local Striker = require "task/attacker/striker"
local Attack = require "util/attack"

function Default:_stop()
	self._forceKeepingInPool = false
end

function Default:check()
	self._forceKeepingInPool = false
	local _, passInfoTable = next(self._inbox.passInfo())
	if passInfoTable then
		for _, passInfo in pairs(passInfoTable) do
			if passInfo and passInfo.target == self._robot then
				self._forceKeepingInPool = true
			end
		end
	end
	self._send.groupApplication("trainer", { name = "midfield", payload = {} })

	return true
end

function Default:_updateTask()
	local _, passInfoTable = next(self._inbox.passInfo())
	local relevantPassInfo = Attack.relevantPassInfoMessage(self._robot, passInfoTable)
	local acceptingPass = Attack.checkPassInfos(self._robot, passInfoTable, false)

	local midfieldZone = self._inbox.midfieldZone().trainer
	local Freebreaker = midfieldZone and Midfield or Striker

	if false and relevantPassInfo and not acceptingPass then
		return SideStep, {relevantPassInfo}
	end
	return acceptingPass and AcceptPass or Freebreaker
end

return Default
