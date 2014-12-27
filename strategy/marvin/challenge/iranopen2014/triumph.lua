local TestAgent = require "agent/testagent"
local TriumphTask = require "challenge/iranopen2014/triumphtask"
local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"
local Messaging = require "control/messaging"

local initialized
local agents = {}

local function run()
	if not initialized then
		for i, robot in ipairs(World.FriendlyRobots) do
			if i > 4 then break end
			table.insert(agents, TestAgent(robot, {
				task = TriumphTask,
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

Entrypoints.add("Technical Challenge/Triumph", run)