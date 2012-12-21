local Pool = {
	Attack = require "pool/attack",
	Defense = require "pool/defense"
}
local TaskManager = require "control/taskmanager"
local World = require "../base/world"
local Settings = require "settings"
local PlayBase = require "play/base"
local Plays = require "play/plays"

local Coordinator = (require "../base/class").new("Control.Coordinator")

function Coordinator:init()
	self._taskmanager = TaskManager.create()
	
	local attackers, defenders = self:_assignRobots()
	self._attackPool = Pool.Attack.create(self._taskmanager, attackers, defenders)
	self._defensePool = Pool.Defense.create(self._taskmanager, attackers, defenders)
	
	self._play = nil
	self._forcePlay = nil
end

function Coordinator:run()
	local attackRatio = self:observeGameState()
	
	-- calculate how many robots to use for attack / defense
	local attackers = attackRatio * #World.FriendlyRobots
	attackers = math.roundTowards(attackers, #self._attackPool:robots(), 0.2)
	local defenders = #World.FriendlyRobots - attackers
	
	-- remove hidden robots from pools
	self._attackPool:removeHiddenRobots()
	self._defensePool:removeHiddenRobots()
	
	local currentAttackers = #self._attackPool:robots()
	local currentDefenders = #self._defensePool:robots()
	
	local occupiedRobots = {}
	for _, robot in pairs(self._attackPool:robots()) do
		occupiedRobots[robot.id] = true
	end
	for _, robot in pairs(self._defensePool:robots()) do
		occupiedRobots[robot.id] = true
	end
	local unassignedRobots = {}
	for _, robot in pairs(World.FriendlyRobots) do
		if not occupiedRobots[robot.id] then
			table.insert(unassignedRobots, robot)
		end
	end
	
	self:_moveRobots(self._attackPool, attackers, self._defensePool, unassignedRobots)
	self:_moveRobots(self._defensePool, defenders, self._attackPool, unassignedRobots)
	
	self:updatePlaySelection()
	
	if self._play then
		self._play:run()
	else
		log("no play found")
	end
	
	self._defensePool:run()
	self._attackPool:run()
	
	self._taskmanager:run()
end

function Coordinator:observeGameState()
	-- if opponent has ball and is in our half -> 5 defenders
	-- if opponent has ball and is in his half -> 3-4 defenders
	-- if we have ball in our half -> 3-4 defenders
	-- if we have ball in opponent half -> 3 defenders
	-- if we are in the opponent half and we've got a freekick -> 2-3 defenders
	-- TODO: analyze field, ball owner, ball getter
	-- TODO: decide how many robots to use for attack / defense
	
	-- evenly distribute robots between attack and defense
	local attackRatio = 0.5
	return attackRatio
end

function Coordinator:_moveRobots(targetPool, targetSize, sourcePool, unassignedRobots)
	local currentSize = #targetPool:robots()
	while currentSize < targetSize do
		if #unassignedRobots > 0 then
			targetPool:addRobot(table.remove(unassignedRobots))
		else
			targetPool:addRobot(sourcePool:releaseRobot())
		end
		currentSize = currentSize + 1
	end
end

function Coordinator:_assignRobots()
	local attackers = {}
	local defenders = {}
	
	-- start with keeper as defender
	local keeper = World.FriendlyRobotsById[World.FriendlyKeeperId]
	if keeper and keeper.isVisible then
		table.insert(defenders, keeper)
	end
	
	-- assign robots alternating
	for _, robot in pairs(World.FriendlyRobots) do
		if not keeper or robot.id ~= keeper.id then
			if #defenders > #attackers then
				table.insert(attackers, robot)
			else
				table.insert(defenders, robot)
			end
		end
	end
	
	return attackers, defenders
end

function Coordinator:updatePlaySelection()
	-- TODO: facilities for learning
	-- get rating of play currently running
	local currentRating = self._play and self._play:currentRating() or PlayBase.rating.no
	
	-- check for timeout
	if self._play and self._startTime and self._play.timeout < World.Time - self._startTime then
		currentRating = PlayBase.rating.no
	end
	
	local ratingGroups = {}
	local maxRating = -1
	
	if self._forcePlay then
		-- just one play to force using it if neccessary
		maxRating = self._forcePlay.startRating(self._attackPool:robots(), self._defensePool:robots(), currentRating)
		ratingGroups[maxRating] = { self._forcePlay }
	else
		for _, play in pairs(Plays) do
			-- check every play
			local rating = play.startRating(self._attackPool:robots(), self._defensePool:robots(), currentRating)
			
			-- group plays by rating
			if not ratingGroups[rating] then
				ratingGroups[rating] = {}
			end
			-- track best rating
			if rating > maxRating then
				maxRating = rating
			end
			table.insert(ratingGroups[rating], play)
		end
	end
	
	-- only switch play if a new play would be better
	if maxRating > currentRating then
		-- only check the best group
		local group = ratingGroups[maxRating]
		local weightSum = 0 -- sum up all weights
		for _, play in ipairs(group) do
			weightSum = weightSum + play.weight
		end
		local randVal = math.random(0, weightSum)
		weightSum = 0
		for _, play in ipairs(group) do
			-- find randomly chosen play
			if randVal < weightSum + play.weight then
				self._play = play.create(self._taskmanager, self._attackPool:robots(), self._defensePool:robots())
				self._startTime = World.Time
				break
			end
			weightSum = weightSum + play.weight
		end
	end
end

function Coordinator:test(play)
	self._forcePlay = play
end

local coord = nil
Entrypoints["main"] = function()
	if not coord then
		coord = Coordinator.create()
	end
	coord:run()
end
