local Moves = Class("Group.Moves")

local Armada = require "groups/moves/armada"

function Moves:init()
	self.name = "moves"
	self.moveList = { Armada }

	for _,move in ipairs(self.moveList) do
		if not move.MIN_ROBOTS or move.MIN_ROBOTS < 0 then
			error("MIN_ROBOTS has to be set!")
		end
	end

	self._currentMove = nil
	self._participatingRobots = {}
end

function Moves:run(sender, nRobots, messages)
	-- check if all participating robots are still available
	if self._currentMove then
		for _,r in ipairs(self._participatingRobots) do
			if not messages[r] then
				self._currentMove = nil
			end
		end
	end

	-- check if current move can be continued
	if self._currentMove then
		if not self._currentMove:canContinue() then
			self._currentMove = nil
		end
	end

	-- choose a new move
	if not self._currentMove then
		local candidates = {}
		for _,move in ipairs(self.moveList) do
			if nRobots >= move.MIN_ROBOTS and move.canStart() then
				table.insert(candidates, move)
			end
		end

		
		-- RANDOM
	end

	if self._currentMove then
		-- run move
	end
end

return Moves