local Coordinator = require "control/coordinator"
local Entrypoints = require "../base/entrypoints"
local TestAgent = require "agent/testagent"
local MoveToPos = require "task/movetopos"
local World = require "../base/world"
local Messaging = require "control/messaging"
local debugcommands = require "../base/debugcommands"
local vis = require "../base/vis"

local positionThreshold = 0.05
local angleThreshold = math.pi / 18
local situations = {
	Duel = require "tests/situation/duel",
	ShootOnEmptyGoal = require "tests/situation/shootonemptygoal",
}
local coord = Coordinator.create()
local situation, initialized, offensive, startTime, observe
local agents = {}
local waitForForce = false -- after positioning, a click on "Force" switches to normal game
local destinations = {}
local function init(sit, isOffensive)
	situation = sit
	initialized = true
	offensive = isOffensive
	if offensive then
		amun.setPreparingSituation(true)
		debugcommands.sendRefereeCommand("GameForce") -- do not keep stop distance to ball
	else -- invert teams and coordinates
		local tmpRobots = {}
		for _, opp in ipairs(situation.opponentRobots) do
			table.insert(tmpRobots, { pos = -opp.pos, dir = -opp.dir })
		end
		situation.friendlyRobots = tmpRobots
	end
	startTime = World.Time
	observe = situation.observe or function() end
	assert(#World.FriendlyRobots == #situation.friendlyRobots,
		"this situation needs " .. #situation.friendlyRobots .. " robots")
	for i, dest in ipairs(situation.friendlyRobots) do
		destinations[World.FriendlyRobots[i]] = dest
		local assignment = {
			task = MoveToPos,
			parameters = { dest.pos, dest.dir }
		}
		table.insert(agents, TestAgent.create(World.FriendlyRobots[i], assignment))
	end
	if offensive then
		destinations.ball = { pos = situation.ballPos }
		-- debugcommands.moveObjects({ pos = situation.ballPos, speed = Vector.create(0,0)}) -- place ball
	end
	Messaging.deliverMessages() -- initialize the module
end

local messageWritten = false
local function allArrived()
	for obj, dest in pairs(destinations) do
		if obj == "ball" then
			if World.Ball.pos:distanceTo(dest.pos) > positionThreshold then
				if World.Time - startTime > 0.5 and not messageWritten then
					log("Please place the ball at (" .. dest.pos.x .. "," .. dest.pos.y 
						.. ") (Visualization \"Manual Ball Position\")")
					messageWritten = true
				end
				if messageWritten then
					vis.addCircle("Manual Ball Position", dest.pos, 0.05, vis.colors.red, true)
				end
				return false
			end
		else -- obj is robot
			if obj.pos:distanceTo(dest.pos) > positionThreshold or
					Vector.fromAngle(obj.dir):angleDiff(Vector.fromAngle(dest.dir)) > angleThreshold then
				return false
			end		
		end
	end
	-- the offensive team also checks the positions of opponents
	-- the ordering of OpponentRobots and opponent FrindlyRobots can differ
	-- so the occupation of the destinations is not bound to a specific robot
	if offensive then
		for _, dest in ipairs(situation.opponentRobots) do
			local occupied = false
			for _, robot in ipairs(World.OpponentRobots) do
				if robot.pos:distanceTo(dest.pos) <= positionThreshold and
						Vector.fromAngle(robot.dir):angleDiff(Vector.fromAngle(dest.dir)) <= angleThreshold then
					occupied = true
				end
			end
			if not occupied then return false end
		end
	end
	return true
end

local function run()
	if amun.isPreparingSituation() then
		if not allArrived() then
			for _, agent in ipairs(agents) do
				agent:run() -- runs a movetopos task
			end
			if World.RefereeState ~= "GameForce" then
				debugcommands.sendRefereeCommand("GameForce")
			end
			waitForForce = false
		elseif offensive and not waitForForce then
			debugcommands.sendRefereeCommand("Halt")
			waitForForce = true
		elseif offensive and waitForForce and World.RefereeState == "GameForce" then
			amun.setPreparingSituation(false)
		end
	else -- game
		if offensive and World.GameStage ~= situation.gameStage then
			debugcommands.sendRefereeCommand(nil, situation.gameStage)
		end
		if offensive and World.RefereeState ~= situation.refereeState and World.RefereeState ~= "Halt" then
			debugcommands.sendRefereeCommand(situation.refereeState)
		end
		coord:run()
		observe()
	end
end

for name, sit in pairs(situations) do
	if #sit.opponentRobots > 0 then
		Entrypoints.add("Situations/"..name.."/Offensive", function() 
			if not initialized then
				init(sit, true)
			else
				run()
			end
		end)
		Entrypoints.add("Situations/"..name.."/Defensive", function() 
			if not initialized then
				init(sit, false)
			else
				run()
			end
		end)
	else
		Entrypoints.add("Situations/"..name, function() 
			if not initialized then
				init(sit, true)
			else
				run()
			end
		end)
	end
end
