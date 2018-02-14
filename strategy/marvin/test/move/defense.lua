--[[
A move to test the defense.

Usage:
To use this move, select the strategy that should be tested as one team, and this move as the other team.
The defending team should be able to fullfill the default ruleset and should be able to respond to placeball commands if tested on the real field.
If used in the simulator, ballplacement is not needed.
The move will start automatically with the first attack. It'll give "Stop" and "Indirect Offensive" on its own. As soon as the situation is resolved (i.e. the ball goes out of play or there's lack of progress), "ForceGame" should be given by the human beeing to continue with the next situation.
There is no automatic logging or detection for mistakes in the defending strategy. If this move is able to score, its in the users responsibility to use a backlog or instant replay and analyse the problem.

Extensions:
If you want to include your newly written move in this test, please make sure to obey the following rules:

* If you use base/referee, make sure that you don't require it on your own, but rely on the Referee you get by inheriting from g/m/base.
	You can use that referee by simply calling <YourMove>.Referee (i.e. Armada.Referee, Ballcycle.Referee etc.)

* Your move-class needs a Field called "TEST_BALL_START_RECTS" that contains a list of axis alligned rectangles. Please make sure that your move will start for every point in one of the rectangles in the list. If your move gets used in normal play, and you don't like the idea of floating your move with this field, you can make a subclass in g/m/defend that extends your move and offers that field.

* Your canStart should start the move if the Ball is in one of the TEST_BALL_START_RECTS (tolerance 5 cm), either during "Stop" or during "IndirectOffensive". However, you can use Referee.opponentTouchedLast, as that will be "true" whenever executed during this move.

* Your canContnue should not continue forever, but stop as soon as the move is over. If canContinue is false, the attack will continue using dynamic attack. So it's very likely that you don't want to include your final goalshoot in your move, but only the first few passes and positions. At least you should stop your move in "Stop" and "GameForce".

To add your move, simply add it to the MOVES table, like the other moves.
]]


local Defense = Class("Group.Move.Defense", require "group/move/base")

local Constants = require "../base/constants"
local debug = require "../base/debug"
local DebugCommands = require "../base/debugcommands"
local vis = require "../base/vis"
local World = require "../base/world"

local DefenderDefault = require "agent/defender/default"
local UtilDebug = require "util/debug"

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
		local originalCanStart = move.canStart
		local function canStartInjectedReferee()
			local oldRef = move.Referee
			move.injectReferee(pseudoRef)
			local res = originalCanStart()
			move.injectReferee(oldRef)
			return res
		end
		move.canStart = canStartInjectedReferee
		return move
end


local MOVES = {
		injectReferee(require "test/move/defend/armada"),
		injectReferee(require "test/move/defend/mrltestcorner"),
		injectReferee(require "test/move/defend/ballcycle"),
		injectReferee(require "test/move/defend/windshieldwiper"),
		injectReferee(require "test/move/movesrc1"),
}

function Defense.canStart()
	return true
end

function Defense:_init()
	self._selectedMove = nil
	self._number = #MOVES
	self._activeRobots = {}
	self._visPolygon = nil
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
		for _,r in  ipairs(self._activeRobots) do
				taskAssignments[r] = {class = "none", params = {}}
		end
		if self._selectedMove and not self._selectedMove:_canContinue() then
			self._selectedMove = nil
		end
		debug.push("Inner Move")
		debug.set(nil, Class.name(MOVES[self._number], true))

		local running = false

		if self._selectedMove then
			running = true
			debug.set("ParticipatingRobots", self._activeRobots)
			local innerTaskAssignment
			innerTaskAssignment, innerMainAttacker = self._selectedMove:updateTasks()
			table.extend(taskAssignments, innerTaskAssignment)
		elseif World.RefereeState == "GameForce" or not self._visPolygon then
			self._number = self._number % #MOVES +1
			self._activeRobots = {}
			local startRectList = MOVES[self._number].TEST_BALL_START_RECTS
			if #startRectList == 0 then
					error("Impossible to use a move for defense testing if there are no good positions")
			end
			local selectedRect = startRectList[math.random(#startRectList)]
			local xMin = math.min(selectedRect[1].x, selectedRect[2].x)
			local xMax = math.max(selectedRect[1].x, selectedRect[2].x)
			local yMin = math.min(selectedRect[1].y, selectedRect[2].y)
			local yMax = math.max(selectedRect[1].y, selectedRect[2].y)
			self._visPolygon = {Vector(xMin, yMin), Vector(xMin, yMax), Vector(xMax, yMax), Vector(xMax, yMin)}
			local xRand = xMin + math.random() * (xMax - xMin)
			local yRand = yMin + math.random() * (yMax - yMin)
			UtilDebug.moveBall("Stop", Vector(xRand, yRand))
			self._stopTime = nil
		end
		if World.RefereeState == "Stop" and not self._stopTime then
			self._stopTime = World.Time
		elseif World.RefereeState == "BallPlacementDefensive" then
			debug.set("distanceToSq", World.Ball.pos:distanceToSq(World.BallPlacementPos))
			debug.set("speedSp", World.Ball.speed:lengthSq())
			self._stopTime = nil -- don't use parts of the graceTime for BallPlacement, relevant in the first run of this move
			UtilDebug.moveBall("Stop")
		end
		if self._visPolygon then
			vis.addPolygon("t/m/defend: selectedRect", self._visPolygon, vis.colors.red, true, true)
		end
		debug.set("running", running)
		if not self._selectedMove and MOVES[self._number].canStart() and #self._robots >= MOVES[self._number].MIN_ROBOTS then
			local class = MOVES[self._number]
			local maxRobots = math.min(class.MAX_ROBOTS, #self._robots)
			local amm = math.random(class.MIN_ROBOTS, maxRobots)
			local truncatedRobots = {}
			for i=1, amm do
				truncatedRobots[i] = self._robots[i]
			end
			self._selectedMove = class(truncatedRobots, self._inbox)
			self._activeRobots = truncatedRobots
			debug.set("lastRobots", self._activeRobots)
		end
		debug.pop()
		local graceTime = ((G.FieldWidth + G.FieldHeight) / Constants.stopSpeed)
		if self._stopTime and (World.Time - self._stopTime) > graceTime then -- wait for both teams to prepare
				DebugCommands.sendRefereeCommand("IndirectOffensive")
				self._stopTime = nil
		elseif self._stopTime then
				debug.set("Time to refStateChange",  - World.Time + self._stopTime + graceTime)
		end
		return taskAssignments, innerMainAttacker
end
return Defense
