local Keeper = (require "../base/class").new("Pool.Keeper", require "pool/base")
local KeeperTask = require "task/keeper"
local World = require "../base/world"

Keeper._conditions = {
	KeeperTask.factory(1)
}
Keeper.robotLimit = 1

function Keeper:_updateTasks()
	if #self._robots > 0 and not self._tasks[1] then
		self._tasks[1] = KeeperTask.create(self._robots[1])
	end
end

function Keeper:_takeRobot(robots)
	for _, robot in pairs(robots) do
		if robot == World.FriendlyKeeper then
			return robot
		end
	end
end

return Keeper
