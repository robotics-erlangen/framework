local TestAgent = require "agent/testagent"
local ShootGoal = require "task/shootgoal"
local DirectPass = require "task/directpass"
local MoveToPos = require "task/movetopos"
local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"
local Ball = require "observer/ball"
local Messaging = require "control/messaging"

local agent1 = nil
local agent2 = nil
local initialized = false
local state = "prepare"

local x = 1.5
local y = 2.5

local function run()
	if World.RefereeState == "Stop" then
		state = "prepare"
		initialized = false
	elseif World.RefereeState == "GameForce" and state == "prepare" then
		state = "go"
		initialized = false
	elseif World.Ball.speed:length() > 2 then
		state = "shoot"
		initialized = false
	end

	if state == "prepare" and not initialized then
		agent1 = TestAgent.create(World.FriendlyRobots[1], {
			task = MoveToPos,
			parameters = { Vector.create(x, y), math.pi }
		})
		agent2 = TestAgent.create(World.FriendlyRobots[2], {
			task = MoveToPos,
			parameters = { Vector.create(-x, y), 0}
		})
		initialized = true
	elseif state == "go" and not initialized then
		agent1 = TestAgent.create(World.FriendlyRobots[1], {
			task = MoveToPos,
			parameters = { Vector.create(x, y), math.pi }
		})
		agent2 = TestAgent.create(World.FriendlyRobots[2], {
			task = DirectPass,
			parameters = {World.FriendlyRobots[1], true, 1}
		})
	elseif state == "shoot" and not initialized then
		agent1 = TestAgent.create(World.FriendlyRobots[1], {
			task = ShootGoal,
			parameters = {}
		})
		agent2 = TestAgent.create(World.FriendlyRobots[2], {
			task = MoveToPos,
			parameters = { Vector.create(-x, y), 0}
		})
		initialized = false
	end

	Messaging.deliverMessages()
	agent1:run()
	agent2:run()
	
end

Entrypoints.add("Volley", run)