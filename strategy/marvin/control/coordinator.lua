local Pool = {
	Attack = require "pool/attack",
	Defense = require "pool/defense",
	Keeper = require "pool/keeper",
	HiddenRobots = require "pool/hiddenrobots"
}
local TaskManager = require "control/taskmanager"
local World = require "../base/world"
local Settings = require "settings"
local PlayBase = require "play/base"
local Plays = require "play/plays"

local Coordinator = (require "../base/class").new("Control.Coordinator")

function Coordinator:init()
	self._taskmanager = TaskManager.create()
	
	self._pools = {
		keeper = Pool.Keeper.create(self._taskmanager),
		defense = Pool.Defense.create(self._taskmanager),
		attack = Pool.Attack.create(self._taskmanager),
		hidden = Pool.HiddenRobots.create(self._taskmanager)
	}
	self._poolGroups = {
		{ self._pools.keeper },
		{ self._pools.defense, self._pools.attack },
		{ self._pools.hidden }
	}
	
	self._play = nil
	self._forcePlay = nil
end

function Coordinator:run()
	self:_updatePoolRobots()
	self:_updatePlaySelection()
	-- TODO: facilities for learning
	
	if self._play then
		self._play:run()
	end
	
	for _, pool in pairs(self._pools) do
		pool:run()
	end
	
	self._taskmanager:run()
end

function Coordinator:_updatePoolRobots()
	-- calculate how many robots to use for attack / defense with hysteresis
	local attackRatio = self:observeGameState()
	local attackers = attackRatio * #World.FriendlyRobots
	attackers = math.roundTowards(attackers, #self._pools.attack:robots(), 0.2)
	local defenders = (1 - attackRatio) * #World.FriendlyRobots
	
	-- if keeper is on the field, it is managed by the keeper pool
	if World.FriendlyKeeper and World.FriendlyKeeper.isVisible then
		defenders = defenders - 1
	end
	defenders = math.roundTowards(defenders, #self._pools.defense:robots(), 0.2)
	
	-- limit robot counts on attack/defense pool, causes automatic robot balancing
	self._pools.attack.robotLimit = attackers
	self._pools.defense.robotLimit = defenders
	
	-- remove no longer needed / surplus robots from pools
	for _, pool in pairs(self._pools) do
		pool:cleanupRobots()
	end
	
	-- find unuassigned robots
	local occupiedRobots = {}
	for _, pool in pairs(self._pools) do
		for _, robot in pairs(pool:robots()) do
			occupiedRobots[robot.id] = true
		end
	end
	local unassignedRobots = {}
	for _, robot in pairs(World.FriendlyRobotsById) do
		if not occupiedRobots[robot.id] then
			table.insert(unassignedRobots, robot)
		end
	end
	
	-- assign robots to pools by pool groups
	-- assign to first group until these pools don't want any further robots
	-- the continue with the second group and so on
	-- if a group has multiple pools assignment altnerates between them
	for _, group in ipairs(self._poolGroups) do
		local groupFinished
		repeat
			groupFinished = true
			for _, pool in ipairs(group) do
				if #unassignedRobots == 0 then
					break
				end
				local robot = pool:takeRobot(unassignedRobots)
				if robot then
					groupFinished = false
					table.removeValue(unassignedRobots, robot)
				end
			end
		until groupFinished
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

function Coordinator:_updatePlaySelection()
	-- get rating of play currently running
	local currentRating = PlayBase.rating.no
	if self._play then
		currentRating = self._play:rate()
		if currentRating == PlayBase.rating.no then
			self._play = nil
		end
	end
	
	local hasRobots = false
	local poolRobots = {}
	for name, pool in pairs(self._pools) do
		local robots = pool:robots()
		poolRobots[name] = robots
		if #robots > 0 then
			hasRobots = true
		end
	end
	-- cannot create plays without robots
	if not hasRobots then
		self._play = nil
		return
	end
	
	local ratingGroups = {}
	local maxRating = PlayBase.rating.no
	local requiredRating = currentRating + 1
	
	if self._forcePlay then
		-- just one play to force using it if neccessary
		local play = self._forcePlay.create(self._taskmanager, poolRobots)
		maxRating = play:rate(requiredRating, true)
		ratingGroups[maxRating] = { play }
	else
		for _, play in pairs(Plays) do
			-- check every play
			local playInst = play.create(self._taskmanager, poolRobots)
			local rating = playInst:rate(currentRating, true)
			
			-- group plays by rating
			if not ratingGroups[rating] then
				ratingGroups[rating] = {}
			end
			table.insert(ratingGroups[rating], playInst)
			
			-- track best rating
			maxRating = math.max(rating, maxRating)
			requiredRating = math.max(requiredRating, maxRating)
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
	assert(play:instanceOf(PlayBase), "This is not a play!")
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
