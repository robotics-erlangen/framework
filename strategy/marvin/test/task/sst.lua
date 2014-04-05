local TestAgent = require "agent/testagent"
local ShootSpeedTest = require "test/task/shootspeedtest"
local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"
local Messaging = require "control/messaging"

local initialized
local agents = {}

local function run()
	if not initialized then
		for i, robot in ipairs(World.FriendlyRobots) do
			if i > 1 then break end
			table.insert(agents, TestAgent.create(robot, {
				task = ShootSpeedTest,
				parameters = { 2 }
			}))
		end
		initialized = true
	end
	Messaging.deliverMessages()
	for _, agent in ipairs(agents) do
		agent:run()
	end
end

Entrypoints.add("ObserverTest/Shoot/ShootSpeed", run)
