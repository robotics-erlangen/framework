--- Loads every task and publishes test functions
local Tasks = {
	Assistant = require "task/assistant",
	CatchBall = require "task/catchball",
	CenterBack = require "task/centerback",
	DirectPass = require "task/directpass",
	FarMirror = require "task/farmirror",
	Keeper = require "task/keeper",
	ManMark = require "task/manmark",
	Mirror = require "task/mirror",
	MoveToPos = require "task/movetopos",
	ReceivePass = require "task/receivepass",
	Shoot = require "task/shoot",
	ShootGoal = require "task/shootgoal",
	ShootGoalImmediately = require "task/shootgoalimmediately"
}

local TaskManager = require "control/taskmanager"

local tm = nil
--- Test the task created by taskProvider
-- @param taskProvider function - function that creates the task to test
-- @return function - Test function
local function testWrapper(taskProvider)
	return function()
		tm = tm or TaskManager.create()
		local tasks = { taskProvider() }
		
		if #tasks > 0 then
			for _, t in ipairs(tasks) do
				tm:assign(t)
			end
		end
		tm:run()
	end
end

-- Adds test functions as entrypoints
-- publishes function test and test_<name>
for name,s in pairs(Tasks) do
	for fn,f in pairs(s) do
		local testname = nil
		if fn == "test" then
			testname = ""
		elseif type(fn) == "string" then
			testname = fn:match("^test(_.+)")
		end
		if testname then
			if type(f) ~= "function" then
				error("Invalid test function " .. fn .. " in task " .. name)
			end
			local test = testWrapper(f)
			Entrypoints["tasks/" .. name .. testname] = function ()
				test()
			end
		end
	end
end

return Tasks
