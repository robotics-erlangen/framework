local Defense = Class("Group.Move.Defense", require "group/move/base")

local Constants = require "../base/constants"
local debug = require "../base/debug"
local DebugCommands = require "../base/debugcommands"
local vis = require "../base/vis"
local World = require "../base/world"

local DefenderDefault = require "agent/defender/default"

local G = World.Geometry


Defense.MIN_ROBOTS = 1
Defense.MAX_ROBOTS = 8

local function injectReferee(move)
		local pseudoRef = {}
		function pseudoRef.opponentTouchedLast()
				return true
		end
		local pseudoRefMeta = {}
		pseudoRefMeta.__index = require "../base/referee"
		setmetatable(pseudoRef, pseudoRefMeta)
		local function canStartInjectedReferee()
			local oldRef = move.Referee
			move.injectReferee(pseudoRef)
			local res = Class.parent(move).canStart()
			move.injectReferee(oldRef)
			return res
		end
		if rawget(move, "canStart") then
			error("Overriding a non-blanc canStart")
		end
		move.canStart = canStartInjectedReferee
		return move
end


local MOVES = {
		injectReferee(require "test/move/defend/armada"),
		injectReferee(require "test/move/defend/mrltestcorner"),
		injectReferee(require "test/move/defend/ballcycle"),
		injectReferee(require "test/move/defend/windshieldwiper"),
		injectReferee(Class("Test.Move.Defend.MoveSRC1", require "test/move/movesrc1")),
}

function Defense.canStart()
	return true
end

function Defense:_init()
	self._selected = nil
	self._number = 5
	self._lastRobots = {}
	self._poly = nil
	self._stopTime = nil
end

function Defense:_canContinue()
	return true
end

function Defense:_updateTasks()
		local taskAssignments = {}
		local innerMainAttacker = nil
		for _,r in ipairs(self._robots) do
				taskAssignments[r] = {behavior = DefenderDefault, params = {} }
		end
		for _,r in  ipairs(self._lastRobots) do
				taskAssignments[r] = {class = "none", params = {}}
		end
		if self._selected and not self._selected:_canContinue() then
			self._selected = nil
		end
		debug.push("Inner Move")
		debug.set(nil, Class.name(MOVES[self._number], true))
		debug.set("running", false)

		if self._selected then
			debug.set("running", true)
			debug.set("ParticipatingRobots", self._lastRobots)
			local innerTaskAssignment
			innerTaskAssignment, innerMainAttacker = self._selected:updateTasks()
			table.extend(taskAssignments, innerTaskAssignment)
		elseif World.RefereeState == "GameForce" or not self._poly then
			self._number = self._number % #MOVES +1
			self._lastRobots = {}
			local goodPosList = MOVES[self._number].DEBUG_GOOD_POS
			if #goodPosList == 0 then
					error("Impossible to use a move for defense testing if there are no good positions")
			end
			local selectedRect = goodPosList[math.random(#goodPosList)]
			local xMin = math.min(selectedRect[1].x, selectedRect[2].x)
			local xMax = math.max(selectedRect[1].x, selectedRect[2].x)
			local yMin = math.min(selectedRect[1].y, selectedRect[2].y)
			local yMax = math.max(selectedRect[1].y, selectedRect[2].y)
			self._poly = {Vector(xMin, yMin), Vector(xMin, yMax), Vector(xMax, yMax), Vector(xMax, yMin)}
			local xRand = xMin + math.random() * (xMax - xMin)
			local yRand = yMin + math.random() * (yMax - yMin)
			local ball = {pos = Vector(xRand, yRand), speed = Vector(0,0)}
			if World.isSimulated then
				DebugCommands.sendRefereeCommand("Stop")
				DebugCommands.moveObjects(ball)
				self._stopTime = World.Time
			else
				DebugCommands.sendRefereeCommand("BallPlacementDefensive", nil, nil, nil, ball.pos) --TODO: Test if works
				self._stopTime = nil
			end
		elseif World.RefereeState == "BallPlacementDefensive" and World.Ball.pos:distanceToSq(World.BallPlacementPos) < 0.0025 and not self._stopTime then
			self._stopTime = World.Time
			DebugCommands.sendRefereeCommand("Stop")
		elseif World.RefereeState == "BallPlacementDefensive" then
			debug.set("distanceToSq", World.Ball.pos:distanceToSq(World.BallPlacementPos))
		end
		if self._poly then
			vis.addPolygon("t/m/defend: selectedRect", self._poly, vis.colors.red, true, true)
		end
		if not self._selected and MOVES[self._number].canStart() and #self._robots >= MOVES[self._number].MIN_ROBOTS then
			local class = MOVES[self._number]
			local maxRobots = math.min(class.MAX_ROBOTS, #self._robots)
			local amm = math.random(class.MIN_ROBOTS, maxRobots)
			local truncatedRobots = table.copy(self._robots)
			for i=amm+1, #self._robots do
				truncatedRobots[i] = nil
			end
			self._selected = class(truncatedRobots, self._inbox)
			self._lastRobots = truncatedRobots
		end
		debug.pop()
		if self._stopTime and (World.Time - self._stopTime) > ((G.FieldWidth + G.FieldHeight ) / Constants.stopSpeed) then -- wait for both teams to prepare
				DebugCommands.sendRefereeCommand("IndirectOffensive")
				self._stopTime = nil
		elseif self._stopTime then
				debug.set("Time to refStateChange",  - World.Time + self._stopTime + (G.FieldWidth + G.FieldHeight) / Constants.stopSpeed)
		end
		return taskAssignments, innerMainAttacker
end
return Defense
