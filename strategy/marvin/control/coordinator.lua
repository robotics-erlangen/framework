local Coordinator = (require "base/class").new("Control.Coordinator")

function Coordinator:init()
	self:assignGoalKeeper()
	-- TODO: create robot pools
	-- TODO: the keeper is always a defender!
	-- TODO: assign robots 3/3
	
	self._play = nil
	self._forcePlay = nil
	self._taskmanager = -- TODO: taskmanager
end

function Coordinator:run()
	self:assignGoalKeeper()
	self:observeGameState()
	-- TODO: update robot count for pools
	
	self._taskmanager:clearAll()
	self:updatePlaySelection()
	
	if self._play then
		self._play:run()
	else
		-- TODO: warning
	end
	
	-- TODO: run pools
	
	self._taskmanager:run()
end

function Coordinator:observeGameState()
	-- TODO: analyze field, ball owner, ball getter
	-- TODO: decide how many robots to use for attack / defense
	-- TODO: hysteresis
end

function Coordinator:assignGoalKeeper()
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
