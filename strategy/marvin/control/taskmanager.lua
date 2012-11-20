local TaskManager = (require "../base/class").new("Control.TaskManager")

local TaskManager:init()
	-- TODO: init
end

local TaskManager:assign(robot, task)
	-- TODO: set task for robot
	-- TODO: do nothing if task is nil
	-- TODO: throw error on override!
end

local TaskManager:task(robot)
	-- TODO: return task or nil
end

local TaskManager:run()
	-- TODO: create message tables for each task - one table for task that have priority and one for the other
	-- TODO: don't include the tasks own message!!!
	-- TODO: execute every task
	-- TODO: save messages from task by robot
	-- TODO: clear tasks afterwards
end

local TaskManager:setKeeper(robot)
	-- TODO: save keeper
end

local TaskManager:keeper()
	-- TODO: return keeper
end

return TaskManager
