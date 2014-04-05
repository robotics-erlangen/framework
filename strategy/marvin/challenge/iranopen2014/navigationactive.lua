local NavigationActive = (require "../base/class").new("NavigationActive", require "control/coordinator")

local TestAgent = require "agent/testagent"
local NavigationTask = require "challenge/iranopen2014/navigationtask"
local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"
local Messaging = require "control/messaging"
local debug = require "../base/debug"

function NavigationActive:init()
	self._firstRobot = TestAgent.create(
		World.FriendlyRobots[1],
		{ task = NavigationTask }
	)		
	self._secondRobot = TestAgent.create(
		World.FriendlyRobots[2],
		{ task = NavigationTask }
	)
	self.specialRoles = {} -- remember roles
end

function NavigationActive:run()
	self._messages = Messaging.getSpecialRoleApplications()
	debug.pushtop("Role Applications")
	for role, application in pairs(self._messages) do
		debug.push(role)
		for robot, rating in pairs(application) do
			debug.set(robot.id, rating)
		end
		debug.pop() -- role
	end
	debug.pop() -- Role Applications
	self:_chooseSpecialRoles()
	Messaging.deliverMessages()
	
	self._firstRobot:run()
	self._secondRobot:run()
end

local coord = nil
Entrypoints.add("Technical Challenge/NavigationActive", function()
	if not coord then
		coord = NavigationActive.create()
	end
	coord:run()
end)

return NavigationActive
