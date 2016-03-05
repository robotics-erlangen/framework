local Coordinator = Class("Control.Coordinator")

local debug = require "../base/debug"
local World = require "../base/world"

local Messaging = require "control/messaging"


function Coordinator:init(trainer, pools, poolGroups)
	self._trainer = trainer
	-- list of agentPools
	self._pools = pools
	-- list of lists with pools
	self._poolGroups = poolGroups

	self._poolsList = {}
	-- get rid of calling pairs over and over again
	for _, pool in pairs(self._pools) do
		table.insert(self._poolsList, pool)
	end
end

function Coordinator:run()
	self._trainer:run()
	self:_postTrainerHook()

	Messaging.deliverMessages()
	self:_updatePoolRobots()
	-- run every pool and thus every agent
	for _, pool in ipairs(self._poolsList) do
		pool:run()
	end
end

function Coordinator:_postTrainerHook()
	-- overwrite in subclasses
end

function Coordinator:_updatePoolRobots()
	-- remove no longer needed / surplus robots from pools
	for _, pool in ipairs(self._poolsList) do
		pool:cleanupRobots()
	end

	-- find unassigned robots
	local occupiedRobots = {}
	for _, pool in ipairs(self._poolsList) do
		for _, robot in ipairs(pool:robots()) do
			occupiedRobots[robot.id] = true
		end
	end
	local unassignedRobots = {}
	for _, robot in ipairs(World.FriendlyRobotsAll) do
		if not occupiedRobots[robot.id] then
			table.insert(unassignedRobots, robot)
		end
	end

	-- assign robots to pools by pool groups
	-- assign to first group until these pools don't want any further robots
	-- the continue with the second group and so on
	-- if a group has multiple pools assignment alternates between them
	for _, group in ipairs(self._poolGroups) do
		local groupFinished
		repeat
			groupFinished = true
			for _, pool in ipairs(group) do
				if #unassignedRobots == 0 then
					break
				end
				local robot = pool:takeRobot(unassignedRobots)
				if robot then
					groupFinished = false
					table.removeValue(unassignedRobots, robot)
				end
			end
		until groupFinished
	end
end

return Coordinator
