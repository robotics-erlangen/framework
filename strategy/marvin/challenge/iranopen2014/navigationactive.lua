local TestAgent = require "agent/testagent"
local NavigationTask = require "challenge/iranopen2014/navigationtask"
local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"
local Messaging = require "control/messaging"

local initialized, firstRobot, secondRobot

local function run()
	if not initialized then
		firstRobot = TestAgent.create(
			World.FriendlyRobots[1],
			{ task = NavigationTask }
		)		
		secondRobot = TestAgent.create(
			World.FriendlyRobots[2],
			{ task = NavigationTask }
		)
		initialized = true
	end
	Messaging.deliverMessages()
	firstRobot:run()
	secondRobot:run()
end

Entrypoints.add("Technical Challenge/NavigationActive", run)
