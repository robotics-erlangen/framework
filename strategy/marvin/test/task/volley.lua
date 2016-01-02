local Entrypoints = require "../base/entrypoints"
local Referee = require "../base/referee"
local vis = require "../base/vis"
local World = require "../base/world"
local TestAgent = require "agent/testagent"
local Messaging = require "control/messaging"
local Ball = require "observer/ball"

local Halt = require "task/halt"
local MoveToPos = require "task/movetopos"
local Pass = require "task/pass"
local ShootGoal = require "task/shootgoal"


local agent1 = nil
local agent2 = nil
local initialized = false
local state = "prepare"
local shootPos = nil
local oldShootPos = nil
local destX = nil

local x = 1.5
local y = 2.0


local function run()
	-- robot selection
	local robot1 = World.FriendlyRobots[2]
	local robot2 = World.FriendlyRobots[1]

	-- evaluation
	if Ball.isShot() == robot1 then
		shootPos = robot1.pos + Vector.fromAngle(robot1.dir) * robot1.shootRadius
	elseif World.Ball.pos.y > World.Geometry.FieldHeightHalf and shootPos then
		destX = World.Ball.pos.x
		local intendedAngle = (World.Geometry.OpponentGoal - shootPos):angle()
		local executedAngle = (Vector(destX, World.Geometry.FieldHeightHalf) - shootPos):angle()
		local errorAngle = (executedAngle - intendedAngle) * 180 / math.pi
		if errorAngle > 0 then
			log("precision error: " .. errorAngle .. " degrees to the left")
		else
			log("precision error: " .. -errorAngle .. " degrees to the right")
		end
		oldShootPos = shootPos
		shootPos = nil
	end

	-- visualization
	if destX then
		local fhh = World.Geometry.FieldHeightHalf
		vis.addPath("test: Volley", {Vector(destX - 0.05, fhh - 0.05),
									Vector(destX + 0.05, fhh + 0.05)}, vis.colors.green)
		vis.addPath("test: Volley", {Vector(destX - 0.05, fhh + 0.05),
									Vector(destX + 0.05, fhh - 0.05)}, vis.colors.green)
		vis.addCircle("test: Volley", oldShootPos, 0.05, vis.colors.greenHalf, true)
	end



	-- state transition
	if Referee.isFriendlyFreeKickState() and state == "prepare" then
		state = "go"
		initialized = false
	elseif World.Ball.speed:length() > 2 and state == "go" then
		state = "shoot"
		initialized = false
	elseif (World.Ball.pos.y > World.Geometry.FieldHeightHalf) and state == "shoot" then
		state = "prepare"
		initialized = false
	end
	if Referee.isStopState() then
		state = "prepare"
		initialized = false
	end


	-- task initialization
	if state == "prepare" and not initialized then
		agent1 = TestAgent(robot1, {
			task = MoveToPos,
			parameters = { Vector(x, y), math.pi }
		})
		agent2 = TestAgent(robot2, {
			task = MoveToPos,
			parameters = { Vector(-x, y), 0}
		})
		initialized = true
	elseif state == "go" and not initialized then
		agent1 = TestAgent(robot1, {
			task = MoveToPos,
			parameters = { Vector(x, y), (World.Ball.pos - robot1.pos):angle() }
		})
		agent2 = TestAgent(robot2, {
			task = Pass,
			parameters = { robot1, nil, true}
		})
		initialized = true
	elseif state == "shoot" and not initialized then
		agent1 = TestAgent(robot1, {
			task = ShootGoal,
			parameters = {nil, true}
		})
		agent2 = TestAgent(robot2, {
			task = Halt,
			parameters = {}
		})
		initialized = true
	end

	-- execution
	Messaging.deliverMessages()
	agent1:run()
	agent2:run()
end

Entrypoints.add("TaskTest/Volley", run)
