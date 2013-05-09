local Keeper = (require "../base/class").new("Agent.Keeper", require "agent/base")
local KeeperTask = require "task/keeper"
local World = require "../base/world"

Keeper.robotLimit = 1

function Keeper.takeRobot(robots)
	for _, robot in pairs(robots) do
		if robot == World.FriendlyKeeper then
			return robot
		end
	end
end

function Keeper:keepRobot()
	return robot.isVisible and robot == World.FriendlyKeeper
end

function Keeper:_run(priorityMessages, notifications, trainerMessage)
	self._task = Assistant.create(self._robot)
	return {}
end

return Keeper