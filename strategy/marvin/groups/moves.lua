local Moves = {}
Moves.name = "moves"

-- constant at "runtime"
Moves.moveList = {}


Moves.currentMove = nil
Moves.participatingRobots = {}

function Moves.run(trainerInstance, nRobots, messages)
	if Moves.currentMove then
		-- check if all participating robots are still available
		-- AND check if current move can be continued
		-- if not, then Moves.currentMove = nil
	end

	if not Moves.currentMove then
		-- filter moveList with nRobots
		-- filter with canStart
		-- if list not empty:
		--     choose one at random
		--     choose participating robots
	end

	if Moves.currentMove then
		-- run move
	end
end

return Moves