local TestAgent = require "agent/testagent"
local AgentPool = require "control/agentpool"
local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"

local FixedRoles = Class("FixedRoles", require "control/coordinator")

function FixedRoles:_updatePoolRobots()
	for _, robot in ipairs(World.FriendlyRobots) do
		if robot.assignment then
			-- assignment: "type/[behaviorType/]/role"
			-- if type is "Agent": put into corresponding pool
			-- else: testagent, own pool per robot
		end
	end
end

function FixedRoles:_calculateAttackRatio() -- not needed
end

local test = nil
Entrypoints.add("Fixed Roles", function()
	if not test then
		test = FixedRoles.create()
	end
	test:run()
end)

return FixedRoles
