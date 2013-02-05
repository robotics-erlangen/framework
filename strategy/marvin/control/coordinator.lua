local Pool = {
	Attack = require "pool/attack",
	Defense = require "pool/defense"
}
local TaskManager = require "control/taskmanager"
local World = require "../base/world"
local Settings = require "settings"
local PlayBase = require "play/base"
local TaskHalt = require "task/halt"
local Plays = require "play/plays"

local Coordinator = (require "../base/class").new("Control.Coordinator")

function Coordinator:init()
	self._taskmanager = TaskManager.create()
	
	local attackers, defenders = self:_assignRobots()
	self._attackPool = Pool.Attack.create(self._taskmanager, attackers, defenders)
	self._defensePool = Pool.Defense.create(self._taskmanager, attackers, defenders)
	
	self._play = nil
	self._forcePlay = nil
	
	self._haltTasks = {}
end

function Coordinator:run()
	local attackRatio = self:observeGameState()
	
	-- remove hidden robots from pools
	self._attackPool:removeHiddenRobots()
	self._defensePool:removeHiddenRobots()
	
	-- calculate how many robots to use for attack / defense
	local attackers = attackRatio * #World.FriendlyRobots
	attackers = math.roundTowards(attackers, #self._attackPool:robots(), 0.2)
	local defenders = #World.FriendlyRobots - attackers
	
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
	for _, robot in ipairs(World.FriendlyRobots) do
		if not occupiedRobots[robot.id] then
			-- Always assign the keeper to the defense pool
			if World.FriendlyKeeper == robot then
				self._defensePool:addRobot(robot)
			else
				table.insert(unassignedRobots, robot)
			end
		end
	end
	
	self:_moveRobots(self._attackPool, attackers, self._defensePool, unassignedRobots)
	self:_moveRobots(self._defensePool, defenders, self._attackPool, unassignedRobots)
	
	self:_updatePlaySelection()
	
	if self._play then
		self._play:run()
	end
	
	self._defensePool:run()
	self._attackPool:run()
	self:_haltUnoccupiedRobots()
	
	self._taskmanager:run()
end

function Coordinator:_haltUnoccupiedRobots()
	for _, robot in ipairs(World.FriendlyRobots) do
		if not self._taskmanager:task(robot) then
			local haltTask = self._haltTasks[robot]
			if not haltTask then
				haltTask = TaskHalt.create(robot)
				self._haltTasks[robot] = haltTask
			end
			self._taskmanager:assign(haltTask)
		end
	end
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
	local keeper = World.FriendlyKeeper
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

function Coordinator:_updatePlaySelection()
	-- TODO: facilities for learning
	-- get rating of play currently running
	local currentRating = PlayBase.rating.no
	if self._play then
		currentRating = self._play:rate()
		if currentRating == PlayBase.rating.no then
			self._play = nil
		end
	end
	
	local ratingGroups = {}
	local maxRating = PlayBase.rating.no
	
	if self._forcePlay then
		-- just one play to force using it if neccessary
		local play = self._forcePlay.create(self._taskmanager, self._attackPool:robots(), self._defensePool:robots())
		maxRating = play:rate(currentRating, true)
		ratingGroups[maxRating] = { play }
	else
		for _, play in pairs(Plays) do
			-- check every play
			local playInst = play.create(self._taskmanager, self._attackPool:robots(), self._defensePool:robots())
			local rating = playInst:rate(currentRating, true)
			
			-- group plays by rating
			if not ratingGroups[rating] then
				ratingGroups[rating] = {}
			end
			table.insert(ratingGroups[rating], playInst)
			
			-- track best rating
			if rating > maxRating then
				maxRating = rating
			end
		end
	end
	
	-- only switch play if a new play would be better
	-- ensures that no play with rating no is started
	if maxRating > currentRating then
		-- only check the best group
		local group = ratingGroups[maxRating]
		local weightSum = 0 -- sum up all weights
		for _, play in ipairs(group) do
			weightSum = weightSum + play.weight
		end
		local randVal = math.random(0, weightSum)
		weightSum = 0
		for _, playInst in ipairs(group) do
			-- find randomly chosen play
			if randVal < weightSum + playInst.weight then
				self._play = playInst
				break
			end
			weightSum = weightSum + playInst.weight
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

return Coordinator
