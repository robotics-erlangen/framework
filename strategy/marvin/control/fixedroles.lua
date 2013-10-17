local TestAgent = require "agent/testagent"
local AgentPool = require "control/agentpool"
local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"

local FixedRoles = (require "../base/class").new("FixedRoles", require "control/coordinator")

local agentsAssigned = false
function FixedRoles:_updatePoolRobots()
	-- every agent is set manually
	-- normal agenttype: use pool
	-- testagent with fixed behavior or task:
		-- own pool per robot
		-- created with an assignment object:
		-- { task = TaskClass, behavior = BehaviorClass, parameters = {}}
		-- if task and behavior are set, the behavior is ignored

	-- TODO
	-- Input of agent/behavior/task for robots
	if not agentsAssigned then

		-- robot 7: keeper
		self._pools.keeper:takeRobot({World.FriendlyRobotsById[1]})
		
		-- robot 1: behavior shoot
		local testRobot1 = World.FriendlyRobotsById[2]
		local assignment = {
			behavior = require "agent/defender/default"
		}
		self._pools.test1 = TestAgent.create(testRobot1, assignment)
		self._pools.test1:takeRobot({testRobot1})
		
		-- robot 3: task farmirror
		local testRobot2 = World.FriendlyRobotsById[3]
		local assignment = {
			task = require "task/farmirror"
		}
		self._pools.test2 = TestAgent.create(testRobot2, assignment)
		self._pools.test2:takeRobot({testRobot2})

		agentsAssigned = true
	end
end

function FixedRoles:observeGameState() -- not needed
end

local test = nil
Entrypoints.add("Fixed Roles", function()
	if not test then
		test = FixedRoles.create()
	end
	test:run()
end)

return FixedRoles
