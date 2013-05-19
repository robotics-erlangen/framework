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
	for robot, msg in pairs(priorityMessages) do
		if msg.task.duelAssistantTarget == self._robot
				and (not self._task or not Class.instanceOf(self._task, ReceivePass)) then
			self._task = ReceivePass.create(self._robot)
		end
	end
	if not self._task then
		self._task = Assistant.create(self._robot)
	end
	return {}
end

return Attacker
