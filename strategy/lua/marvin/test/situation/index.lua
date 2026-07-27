--[[***********************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
*************************************************************************]]

local debugtree = require "../base/debug"
local debugcommands = require "../base/debugcommands"
local Entrypoints = require "../base/entrypoints"
local vis = require "../base/vis"
local World = require "../base/world"

local Coordinator = require "control/maincoordinator"
local Messaging = require "control/messaging"
local MoveToPos = require "task/shared/movetopos"
local TestHelper = require "test/helper/agent"

local situations = {
	Duel = require "test/situation/duel",
	goalKick = require "test/situation/goalkick",
	Pass = require "test/situation/pass",
	ShootOnEmptyGoal = require "test/situation/shootonemptygoal"
}


local positionThreshold = 0.1 -- the precision for considering a position to be occupied
local angleThreshold = math.pi / 18
local goalies = { blue = nil, yellow = nil }
local destinations = { yellow = {}, blue = {} } -- for setup, inner objects indexed by robot
local messaging = nil
local setupAgents = {}
local state -- can be one of "prepare", "arrived", "waitForForce", "game"
local situation, initialized

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

local function checkNumberOfRobots()
	local ownColor = World.TeamIsBlue and "blue" or "yellow"
	local otherColor = World.TeamIsBlue and "yellow" or "blue"
	local ownRequired = table.count(situation[ownColor .. "Robots"] or {})
	local otherRequired = table.count(situation[otherColor .. "Robots"] or {})
	local ownRobotCount = #World.FriendlyRobotsAll
	if ownRobotCount < ownRequired then
		local num = (ownRequired - ownRobotCount)
		local robot_s = num == 1 and " robot" or " robots"
		error("this situation needs " .. num .. " more " .. ownColor .. robot_s)
	elseif ownRobotCount > ownRequired then
		local robot_s = ownRequired == 1 and " robot" or " robots"
		log("this situation is encoded for " .. ownRequired .. " " .. ownColor .. robot_s)
	end
	if #World.OpponentRobots ~= otherRequired then
		local robot_s = otherRequired == 1 and " robot" or " robots"
		log("this situation is encoded for " .. otherRequired .. " " .. otherColor .. robot_s)
	end
end

local function computeDestinations()
	local fieldRobots = {
		blue = World.TeamIsBlue and World.FriendlyRobots or World.OpponentRobots,
		yellow = World.TeamIsBlue and World.OpponentRobots or World.FriendlyRobots
	}
	for color, robots in pairs(fieldRobots) do
		local index = 1
		for id, dest in pairs(situation[color .. "Robots"] or {}) do
			if robots[index] then
				destinations[color][robots[index]] = dest
				if id == situation[color .. "Goalie"] then
					goalies[color] = robots[index].id
				end
				index = index + 1
			end
		end
	end
end

local function createAgentsAndMoveTasks()
	for robot, destination in pairs(destinations[World.TeamIsBlue and "blue" or "yellow"]) do
		table.insert(setupAgents, TestHelper.staticAgent(robot,
			TestHelper.staticBehavior(MoveToPos, { destination.pos, destination.dir:angle() }),
			messaging)
		)
	end
end

local function haveRobotsArrived()
	for robot, destination in pairs(destinations[World.TeamIsBlue and "blue" or "yellow"]) do
		if robot.pos:distanceTo(destination.pos) > positionThreshold or
				destination.dir:angleDiff(Vector.fromAngle(robot.dir)) > angleThreshold then
			return false
		end
	end
	return true
end

local ballMessagePrinted = false
local ballThanksMessagePrinted = true -- don't print if ball is already there
local function isBallPositioned()
	if not World.TeamIsBlue then
		return true -- blue team cares about ball
	end
	if World.Ball.pos:distanceTo(situation.ball.pos) > positionThreshold then
		vis.addCircle("test: Manual Ball Position", situation.ball.pos, 0.05, vis.colors.red, true)
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

local function init(situation_)
	situation = situation_
	assert(amun.isDebug, "only works in debug mode")
	if World.TeamIsBlue then
		invertCoordinates() -- situation is saved from yellow's point of view
	end
	messaging = Messaging()
	checkNumberOfRobots()
	computeDestinations()
	if World.gameStageMapping[situation.gameStage] then -- support Protobuf and Strategy stage names
		situation.gameStage = World.gameStageMapping[situation.gameStage]
	end
	createAgentsAndMoveTasks()
	debugcommands.sendRefereeCommand("GameForce", nil, goalies.blue, goalies.yellow)
	state = "prepare"
	messaging:deliverMessages() -- initialize the module
	initialized = true
end

local coordinator, arrivedTime
local function run()
	debugtree.set("situation state", state)
	if state == "prepare" then
		if World.RefereeState ~= "GameForce" then
			debugcommands.sendRefereeCommand("GameForce", nil)
		end
		for _, agent in ipairs(setupAgents) do
			agent:run()
		end
		if isBallPositioned() and haveRobotsArrived() then
			state = "arrived"
			arrivedTime = World.Time
			debugcommands.sendRefereeCommand("Halt", nil)
		end
	elseif state == "arrived" then
		if not (isBallPositioned() and haveRobotsArrived()) then
			state = "prepare"
		end
		if World.RefereeState == "Halt" then
			-- if other team is still in prepare, it sets "GameForce"
			-- which should take less than 0.2 seconds
			if World.Time - arrivedTime > 0.2 then
				state = "waitForForce"
			end
		else
			arrivedTime = World.Time
		end
	elseif state == "waitForForce" then
		if not (haveRobotsArrived() and isBallPositioned()) then
			state = "prepare"
		end
		if World.RefereeState == "GameForce" then
			state = "game"
			messaging:deliverMessages() -- clear testagent messages
			debugcommands.sendRefereeCommand(situation.refereeState, situation.gameStage)
		end
	elseif state == "game" then
		if situation.observe then situation.observe() end
		if not coordinator then coordinator = Coordinator() end
		coordinator:run()
	else
		error("invalid game state " .. state)
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
