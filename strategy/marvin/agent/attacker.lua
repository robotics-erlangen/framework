local Attacker = (require "../base/class").new("Agent.Attacker", require "agent/base")
local World = require "../base/world"

local Assistant = require "task/assistant"
local ReceivePass = require "task/receivepass"

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

Attacker._behaviours = {
	"ReceivePass",
	"Default"
}

function Attacker:checkReceivePass()
	for robot, msg in pairs(self._messages) do
		if msg.task.duelAssistantTarget == self._robot then
			return true
		end
	end
	return false
end

function Attacker:doReceivePass()
	if not self._task then
		self._task = ReceivePass.create(self._robot)
	end
end

function Attacker:checkDefault()
	return true
end

function Attacker:doDefault()
	if not self._task then
		self._task = Assistant.create(self._robot)
	end
end

return Attacker
