--[[
--- Generates test function for a Task
module "util.test"
]]--
local debug = require "../base/debug"
local World = require "../base/world"
local TaskManager = require "control/taskmanager"

local test = {}

local tm = nil
local task = nil

--- Test the task created by taskProvider
-- Must be added to a task as a member function.
-- @param taskProvider function - function that creates the task to test
-- @return function - Test function
function test.task(taskProvider)
	return function()
		tm = tm or TaskManager.create()
		task = task or taskProvider()
		
		if task and task:robot() then
			tm:assign(task)
		else
			task = nil
		end
		
		tm:run()
	end
end

return test
