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
	return self._robot.isVisible and self._robot == World.FriendlyKeeper
end

Keeper._behaviours = {
	"Default"
}

function Keeper:checkDefault()
	return true
end

function Keeper:doDefault()
	if not self._task then
		self._task = KeeperTask.create(self._robot)
	end
end

return Keeper
