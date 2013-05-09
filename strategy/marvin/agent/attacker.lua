local Attacker = (require "../base/class").new("Agent.Attacker", require "agent/base")
local World = require "../base/world"
local Assistant = require "task/assistant"

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

function Attacker:_run(priorityMessages, notifications, trainerMessage)
	if not self._task then
		self._task = Assistant.create(self._robot)
	end
	return {}
end

return Attacker
