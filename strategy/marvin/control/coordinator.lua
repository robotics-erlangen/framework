local Pool = {
	Attack = require "pool/attack",
	Defense = require "pool/defense"
}
local TaskManager = require "control/taskmanager"
local World = require "base/world"

local Coordinator = (require "base/class").new("Control.Coordinator")

function Coordinator:init()
	self._taskmanager = TaskManager.create()
	
	self:_assignGoalKeeper()
	local attackers, defenders = self:_assignRobots()
	self._attackPool = Pool.Attack.create(attackers, defenders)
	self._defensePool = Pool.Defense.create(attackers, defenders)
	
	self._play = nil
	self._forcePlay = nil
end

function Coordinator:run()
	self:assignGoalKeeper()
	self:observeGameState()
	
	self._attackPool:removeHiddenRobots()
	self._defensePool:removeHiddenRobots()
	
	-- TODO: update robot count for pools
	-- TODO: hysteresis
	-- TODO: add new robots
	
	self._taskmanager:clearAll()
	self:updatePlaySelection()
	
	if self._play then
		self._play:run()
	else
		-- TODO: warning
	end
	
	self._defensePool:run()
	self._attackPool:run()
	
	self._taskmanager:run()
end

function Coordinator:observeGameState()
	-- TODO: analyze field, ball owner, ball getter
	-- TODO: decide how many robots to use for attack / defense
	
	-- evenly distribute robots between attack and defense
	self._attackRatio = 0.5
end

function Coordinator:_assignRobots()
	-- assign robots alternating
	-- start with keeper as defender
	
	-- TODO: the keeper is always a defender!
	-- TODO: return attackers and defenders
end

function Coordinator:_assignGoalKeeper()
	
	-- TODO: tell TaskManager which robot should be the keeper
end

function Coordinator:updatePlaySelection()
	-- TODO: if play is forced, run play rating then assign play
	-- TODO: check play rating
	-- TODO: choose new play if neccessary
	-- TODO: check timeout
end

function Coordinator:test(play)
	self._forcePlay = play
end
