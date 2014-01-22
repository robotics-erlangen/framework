local Coordinator = require "control/coordinator"
local Entrypoints = require "../base/entrypoints"
local TestAgent = require "agent/testagent"
local MoveToPos = require "task/movetopos"
local World = require "../base/world"
local Messaging = require "control/messaging"
local debugcommands = require "../base/debugcommands"
local vis = require "../base/vis"

local situations = {
	Duel = require "tests/situation/duel",
	ShootOnEmptyGoal = require "tests/situation/shootonemptygoal",
}

-- the precision for considering a robot to occupy a position
local positionThreshold = 0.05
local angleThreshold = math.pi / 18

local TODOCheckForSimulator = false
local coord = Coordinator.create()
local situation, initialized
local destinations = {} -- for setup, indexed by robot
local setupAgents = {}
local state -- can be one of "prepare", "arrived", "waitForForce", "game"

local function init(situation_)
	situation = situation_
	local robotDests = World.TeamIsBlue and situation.blueRobots or situation.yellowRobots
	local keeperID = World.TeamIsBlue and situation.blueGoalie or situation.yellowGoalie
	local requiredRobots = 0
	for _, _ in pairs(robotDests) do
		requiredRobots = requiredRobots + 1
	end
	assert(#World.FriendlyRobots == requiredRobots,
		"this situation needs " .. requiredRobots .. " robots")

	if World.TeamIsBlue then
		for _, dest in pairs(robotDests) do
			dest.pos = -dest.pos
			dest.dir = -dest.dir
			dest.speed = -dest.speed
			dest.angularSpeed = -dest.angularSpeed
		end
	end
	
	-- take available robots, ignore id described in situation
	local unassignedRobots = {}
	for _, robot in ipairs(World.FriendlyRobots) do
		if robot.id == keeperID then
			destinations[robot] = robotDests[keeperID]
		else
			table.insert(unassignedRobots, robot)
		end
	end
	local destId, dest
	for _, robot in ipairs(unassignedRobots) do
		destId, dest = next(robotDests, destId)
		if destId == keeperID then
			destId, dest = next(robotDests, destId)
		end
		destinations[robot] = dest
	end
	
	-- support Protobuf and Strategy stage names
	if World.gameStageMapping[situation.gameStage] then
		situation.gameStage = World.gameStageMapping[situation.gameStage]
	end

	if TODOCheckForSimulator then
		local moveTargets = {}
		for robot, destination in pairs(destinations) do
			-- debugcommands.moveObjects() needs ids, don't take from situation
			moveTargets[robot.id] = destination
		end
		debugcommands.moveObjects(situation.ball, moveTargets)
		--debugcommands.sendRefereeCommand(situation.refereeState, situation.gameStage,
		--	situation.blueGoalie, situation.yellowGoalie)
		state = "game"
	else
		for robot, destination in pairs(destinations) do
			local assignment = {
				task = MoveToPos,
				parameters = { destination.pos, destination.dir:angle() }
			}
			table.insert(setupAgents, TestAgent.create(robot, assignment))
		end
		debugcommands.sendRefereeCommand("GameForce", nil, situation.blueGoalie, situation.yellowGoalie)
		state = "prepare"
	end

	Messaging.deliverMessages() -- initialize the module
	amun.situationtestSetReady(false)
	initialized = true
end

local function allArrived()
	for robot, destination in pairs(destinations) do
		if robot.pos:distanceTo(destination.pos) > positionThreshold or
				destination.dir:angleDiff(Vector.fromAngle(robot.dir)) > angleThreshold then
			return false
		end
	end
	return true
end

local ballMessagePrinted = false
local ballThanksMessagePrinted = true -- don't print if ball is already there
local function checkBall()
	if World.TeamIsBlue then
		-- yellow team cares about ball
		return true
	end
	if World.Ball.pos:distanceTo(situation.ball.pos) > positionThreshold then
		vis.addCircle("Manual Ball Position", situation.ball.pos, 0.05, vis.colors.red, true)
		if not ballMessagePrinted then
			log("Please place the ball at " .. tostring(situation.ball.pos)
				.. " (Visualization \"Manual Ball Position\")")
			ballMessagePrinted = true
			ballThanksMessagePrinted = false
		end
		return false
	end
	if not ballThanksMessagePrinted then
		log("thanks") -- for placing the ball
		ballThanksMessagePrinted = true
		ballMessagePrinted = false -- print again if ball moves
	end
	return true
end

local function run()
	if state == "prepare" then
		if World.RefereeState ~= "GameForce" then
			debugcommands.sendRefereeCommand("GameForce", nil)
		end
		for _, agent in ipairs(setupAgents) do
			agent:run()
		end
		if allArrived() and checkBall() then	
			state = "arrived"
			amun.situationtestSetReady(true)
		end
	elseif state == "arrived" then
		if not (allArrived() and checkBall()) then
			state = "prepare"
			amun.situationtestSetReady(false)
		end
		if amun.situationtestIsOtherTeamReady() then
			debugcommands.sendRefereeCommand("Halt")
		end
		if World.RefereeState == "Halt" then
			state = "waitForForce"
		end
	elseif state == "waitForForce" then
		if not (allArrived() and checkBall()) then
			state = "prepare"
			amun.situationtestSetReady(false)
		end
		if World.RefereeState == "GameForce" then
			state = "game"
			debugcommands.sendRefereeCommand(situation.refereeState, situation.gameStage)
		end
	elseif state == "game" then
		if not amun.situationtestIsOtherTeamReady() then
			state = "prepare"
			amun.situationtestSetReady(false)
		end
		if situation.observe then
			situation.observe()
		end
		coord:run()
	else
		error("invalid state " .. state)
	end
end

for name, situation in pairs(situations) do
	Entrypoints.add("Situations/"..name, function() 
		if not initialized then
			init(situation)
		else
			run()
		end
	end)
end
