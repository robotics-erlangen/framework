local TaskManager = (require "base/class").new("Control.TaskManager")

local TaskManager:init(robots)
	self._robots = robots
	-- TODO: !!always check if robot is controlled!!
end

local TaskManager:assign(robot, tactic)
	-- TODO: set task for robot
	-- TODO: do nothing if tactic is nil
	-- TODO: throw error on override!
end

local TaskManager:tactic(robot)
	-- TODO: return tactic or nil
end

local TaskManager:run()
	-- TODO: create message tables for each task - one table for task that have priority and one for the other
	-- TODO: don't include the tasks own message!!!
	-- TODO: execute every task
	-- TODO: save messages from task by robot
	-- TODO: clear tasks afterwards
end

local TaskManager:_setKeeper(robot)
	-- TODO: save keeper
end

local TaskManager:keeper()
	-- TODO: return keeper
end

return TaskManager
