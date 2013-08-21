local Entrypoints = require "../base/entrypoints"

--- Loads every task and publishes test functions
local Tasks = {
	Assistant = require "task/assistant",
	CatchBall = require "task/catchball",
	CenterBack = require "task/centerback",
	ChipAway = require "task/chipaway",
	DirectPass = require "task/directpass",
	Duel = require "task/duel",
	FarMirror = require "task/farmirror",
	Keeper = require "task/keeper",
	ManMark = require "task/manmark",
	Mirror = require "task/mirror",
	MoveToPos = require "task/movetopos",
	PassReceiver = require "task/passreceiver",
	PassTarget = require "task/passtarget",
	RescueRobot = require "task/rescuerobot",
	Shoot = require "task/shoot",
	ShootGoal = require "task/shootgoal"
}

local debug = require "../base/debug"
local World = require "../base/world"
local Class = require "../base/class"
local Messages = require "control/messages"

local lastMessages = Messages.create()
local taskFactories = nil
local instances = {}
--- Test the task created by taskProvider
-- @param taskProvider function - function that creates the task to test
-- @return function - Test function
local function testWrapper(taskProvider)
	return function()
		if not taskFactories then
			-- get factory functions to create tasks
			taskFactories = {}
			while true do
				-- ask for functions until nil is returned
				-- taskProvider is called with the current factory id
				-- has to return a factory function and the required robot count for it
				local factory, robotCount = taskProvider(#taskFactories)
				if not factory then
					break
				elseif not robotCount then
					error("robot count missing from task test function")
				end
				table.insert(taskFactories, {factory, robotCount})
			end
		end
		
		local usedRobots = {}
		local activeInstances = {}
		-- cleanup old instances
		for _, inst in ipairs(instances) do
			local task, robots, fac = inst[1], inst[2], inst[3]
			local ok = true
			-- task instance is only kept if all relevant robots are visible
			for _, r in ipairs(robots) do
				if not r.isVisible then
					ok = false
					break
				end
			end
			if ok then
				-- keep task instance
				table.insert(activeInstances, inst)
				for _, r in ipairs(robots) do
					usedRobots[r] = true
				end
			else
				-- queue factory for reuse
				table.insert(taskFactories, fac)
			end
		end
		instances = activeInstances
		
		-- get unused robots
		local unusedRobots = {}
		for _, r in pairs(World.FriendlyRobots) do
			if not usedRobots[r] then
				table.insert(unusedRobots, r)
			end
		end
		
		-- try to instanties remaining factories
		while #taskFactories > 0 do
			local tf = taskFactories[1]
			local fac, count = tf[1], tf[2]
			-- check for robot count
			if #unusedRobots >= count then
				-- take required robots
				local robots = {}
				for i = 1, count do
					local r = table.remove(unusedRobots, 1)
					table.insert(robots, r)
				end
				-- instantiate task
				local task = fac(robots)
				table.remove(taskFactories, 1)
				table.insert(instances, {task, robots, tf})
			else
				break
			end
		end
		
		lastMessages:setTrainer({})
		lastMessages:dump()
		local messages = Messages.create()
		-- run, fake agent
		for i, inst in ipairs(instances) do
			local task = inst[1]
			local priorityMessages, notifications = lastMessages:split(task:robot())
			debug.push("Task " .. i)
			debug.set(nil, Class.name(task))
			debug.set("rating", task:rate(priorityMessages, notifications))
			local message = { agent = {}, task = task:run(priorityMessages, notifications) or {} }
			messages:addAgent(task:robot(), message, task.priority)
			debug.pop()
		end
		lastMessages = messages
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
			Entrypoints.add("tasks/" .. name .. testname, function ()
				test()
			end)
		end
	end
end

return Tasks
