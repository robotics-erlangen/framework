local TaskManager = (require "../base/class").new("Control.TaskManager")
local World = require "../base/world"
local debug = require "../base/debug"
local Base = require "task/base"

function TaskManager:init()
	self._assignment = {}
	self._lastAssignment = {}
	self._messages = {}
end

function TaskManager:assign(task)
	-- ignore setting a nil task
	if task == nil then
		return
	end
	local robot = task:robot()
	if self._assignment[robot] then
		log(robot.id)
		error("Robot assigned twice")
	end
	if not task:instanceOf(Base) then
		log(task.className)
		error("This is not a task!")
	end
	self._assignment[robot] = task
end

function TaskManager:task(robot)
	return self._assignment[robot]
end

function TaskManager:run()
	local messages = {}
	
	for robot, task in pairs(self._assignment) do
		local priorityMessages = {}
		local notifications = {}
		
		-- create message tables for task
		for lrobot, message in pairs(self._messages) do
			local lastTask = self._lastAssignment[lrobot]
			local currentTask = self._assignment[lrobot]
			-- drop message if the task for that robot was changed
			-- don't send own message to task
			if lastTask == currentTask and currentTask ~= task then
				-- currentTask has priority if his priority is higher then task's priority or when both are equal and his robot id is lower
				if currentTask.priority > task.priority
						or (currentTask.priority == task.priority and lrobot.id < robot.id) then
					priorityMessages[lrobot] = message
				else
					notifications[lrobot] = message
				end
			end
		end
		
		messages[robot] = task:run(priorityMessages, notifications)
	end
	
	self._messages = messages
	
	-- clear current tasks
	self._lastAssignment = self._assignment
	self._assignment = {}
end

function TaskManager:simulate(task)
	local priorityMessages = {}
	local notifications = {}
	local robot = task:robot()
	
	-- create message tables for task
	for lrobot, message in pairs(self._messages) do
		local currentTask = self._lastAssignment[lrobot]
		-- dropping messages for tasks that changed can't be done here
		-- don't send own message to task
		if currentTask and currentTask:robot() ~= robot then
			-- currentTask has priority if his priority is higher then task's priority or when both are equal and his robot id is lower
			if currentTask.priority > task.priority
					or (currentTask.priority == task.priority and lrobot.id < robot.id) then
				priorityMessages[lrobot] = message
			else
				notifications[lrobot] = message
			end
		end
	end
	
	return task:rate(priorityMessages, notifications)
end

return TaskManager
