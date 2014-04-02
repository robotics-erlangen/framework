-- create 6 testagents with passive task and number 1-6
local TestAgent = require "agent/testagent"
local NavigationPassiveTask = require "challenge/iranopen2014/navigationpassivetask"
local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"
local Messaging = require "control/messaging"

local initialized
local agents = {}

local function run()
	if not initialized then
		for i, robot in ipairs(World.FriendlyRobots) do
			if i > 6 then break end
			table.insert(agents, TestAgent.create(robot, {
				task = NavigationPassiveTask,
				parameters = { i }
			}))
		end
		initialized = true
	end
	Messaging.deliverMessages()
	for _, agent in ipairs(agents) do
		agent:run()
	end
end

Entrypoints.add("Technical Challenge/NavigationPassive", run)
