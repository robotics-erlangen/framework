local Coordinator = require "control/coordinator"
local Entrypoints = require "../base/entrypoints"
local TestAgent = require "agent/testagent"
local MoveToPos = require "task/movetopos"
local World = require "../base/world"
local Messaging = require "control/messaging"
local debugcommands = require "../base/debugcommands"
local vis = require "../base/vis"

local situations = {
	Duel = require "test/situation/duel",
	ShootOnEmptyGoal = require "test/situation/shootonemptygoal",
	Pass = require "test/situation/pass"
}

-- the precision for considering a robot to occupy a position
local positionThreshold = 0.05
local angleThreshold = math.pi / 18

local coordinator, situation, initialized
local destinations = {} -- for setup, indexed by robot
local setupAgents = {}
local state -- can be one of "prepare", "arrived", "waitForForce", "game"

local function invertCoordinates()
	situation.ball.pos = -situation.ball.pos
	situation.ball.speed = -situation.ball.speed
	for _, dest in pairs(situation.yellowRobots or {}) do
		dest.pos = -dest.pos
		dest.dir = -dest.dir
		dest.speed = -dest.speed
		dest.angularSpeed = -dest.angularSpeed
	end
	for _, dest in pairs(situation.blueRobots or {}) do
		dest.pos = -dest.pos
		dest.dir = -dest.dir
		dest.speed = -dest.speed
		dest.angularSpeed = -dest.angularSpeed
	end
end

local function getDestinations(isBlue)
	local tmpDestinations = {}
	local robotDests = isBlue and situation.blueRobots or situation.yellowRobots
	local keeperID = isBlue and situation.blueGoalie or situation.yellowGoalie
	local available = (isBlue == World.TeamIsBlue)
		and World.FriendlyRobots or World.OpponentRobots

	local requiredRobots = 0
	for _, _ in pairs(robotDests or {}) do
		requiredRobots = requiredRobots + 1
	end
	if requiredRobots == 0 then
		return {}
	end
	local color = isBlue and " blue" or " yellow"
	assert(#available == requiredRobots,
		"this situation needs " .. requiredRobots .. color .. " robots")

	-- take available robots, ignore id described in situation
	local unassignedRobots = {}
	for _, robot in ipairs(available) do
		if robot.id == keeperID then
			tmpDestinations[robot] = robotDests[keeperID]
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
		tmpDestinations[robot] = dest
	end
	return tmpDestinations
end

local function init(situation_)
	situation = situation_
	assert(amun.isDebug, "only works in debug mode")

	if World.TeamIsBlue then
		-- situation is saved from yellow's point of view
		invertCoordinates()
	end

	destinations = getDestinations(World.TeamIsBlue)

	-- support Protobuf and Strategy stage names
	if World.gameStageMapping[situation.gameStage] then
		situation.gameStage = World.gameStageMapping[situation.gameStage]
	end

	if World.IsSimulated then
		if World.TeamIsBlue then
			local friendlyMoveTargets = {}
			for robot, destination in pairs(destinations) do
				friendlyMoveTargets[robot.id] = destination
			end
			local yellowDestinations = getDestinations(false)
			local opponentMoveTargets = {}
			for robot, destination in pairs(yellowDestinations) do
				opponentMoveTargets[robot.id] = destination
			end
			debugcommands.moveObjects(situation.ball, friendlyMoveTargets, opponentMoveTargets)
			debugcommands.sendRefereeCommand(situation.refereeState, situation.gameStage,
				situation.blueGoalie, situation.yellowGoalie)
		end
		amun.situationtestSetReady(true)
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
		amun.situationtestSetReady(false)
	end

	Messaging.deliverMessages() -- if strategy was reloaded, this removes old messages
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
	if not World.TeamIsBlue then
		-- blue team cares about ball
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
	if state == "game" then
		if not amun.situationtestIsOtherTeamReady() and not World.IsSimulated then
			state = "prepare"
			amun.situationtestSetReady(false)
		end
		if situation.observe then
			situation.observe()
		end
		if not coordinator then
			coordinator = Coordinator.create()
		end
		coordinator:run()
	else
		coordinator = nil
		Messaging.deliverMessages()
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
		end
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

Entrypoints.add("Situations/select File", function()
	local ert = amun.selectSituation()
	log(ert)
end)
