local Base = require "agent/base/behavior"
local Move = Class("Agent.Moves.Move", Base)

local Armada = require "moves/armada"
local debug = require "../base/debug"
local RouletteWheelSelection = require "learning/roulettewheelselection"
local World = require "../base/world"

local offsetTable = {} -- maps every robot to an unique offset between 1 and sizeof selected Move
local offsetTableSize = 0
local selectedMove = nil
local isActive = false
local isTired = false
local moves = {
	Armada
}

--TODO: Report Success / Failure to RoulettWheelSelection


function Move:_stop()
	self._offset = nil
end

function Move:check()
	local involvedRobots = {}
	for robot, _ in pairs(self._inbox.standardMoveFlag("broadcast")) do
		table.insert(involvedRobots, robot)
	end

	if isTired then
		if #involvedRobots == 0 then
			isTired = false
		else
			return false -- this is the frame when we stopped one move, don't start another one right now.
		end
	end

	if selectedMove and #involvedRobots >= selectedMove.size() then
		isActive = true
	elseif selectedMove and #involvedRobots > 0 then -- we don't have eanough bots for this move, so stop it.
		selectedMove = nil
		isActive = false
		isTired = true
		return false
	end

	if self._inbox.mainAttacker().trainer == self._robot then --MA mustn't participate in a move
		return false
	end

	if selectedMove and selectedMove.excludeKeeper() and self._robot == World.FriendlyKeeper then
		return false
	end

	if selectedMove and #involvedRobots > selectedMove.size() and self._robot == World.FriendlyKeeper then
		--we don't want to use the keeper, if we don't need to
		return false
	end


	if isActive then
		debug.set("selected Move",selectedMove.getName())
		local continue = selectedMove.canContinue()
		debug.set("continue", continue)
		if not continue then --the move wants normal game to take over
			selectedMove = nil
			isActive = false
			isTired = true
			return false
		end

		self._send.standardMoveFlag("all")

		local offset = offsetTable[self._robot]
		if offset then --regular case, we are already in the table
			debug.set("offset","regular")
			self._offset = offset
			return true
		end

		--we are not in the table, but the table is filled
		if offsetTableSize == selectedMove.size() then
			-- try to take the spot of the (new) mainattacker
			local mainAttacker = self._inbox.mainAttacker().trainer
			if mainAttacker then
				offset = offsetTable[mainAttacker]
				if offset then
					self._offset = offset
					offsetTable[self._robot] = offset
					offsetTable[mainAttacker] = nil
					debug.set("offset","old MA")
					return true
				end
			end

			-- try to take the spot of the (new) goalie, only if the goalie mustn't participate in this move
			---- if you take the spot of the goalie, even if he may participate in this move, you'll only use your goalie if you need to
			---- but then you'll have one frame, where its offset is take twice and the goalie swaps to the move behavior.
			---- this should be ok, as long as we only start moves during Stop, but it's not very nice.
			local keeper = World.FriendlyKeeper
			offset = offsetTable[keeper]
			if selectedMove.excludeKeeper() and offset then
				self._offset = offset
				offsetTable[self._robot] = offset
				offsetTable[keeper] = nil
				debug.set("offset","old Keeper")
				return true
			end
			return false -- the move has enough robots
		end

		-- there is some space in the table left, so take it
		offsetTable[self._robot] = offsetTableSize + 1
		offsetTableSize = offsetTableSize + 1
		self._offset = offsetTable[self._robot]
		debug.set("offset","size")
		return true

	end
	--if not isActive and
	if selectedMove then
		--this is the first frame of the selected Move. Static data is initialized.
		--Nobody knows, whether there are enough robots for this move or not, so simply send a message, that we want to participate
		self._send.standardMoveFlag("all")
		return false
	end
	--else
	local movesBitmap = {}
	local anyMatch = false
	for index,move in ipairs(moves) do
		movesBitmap[index] = move.canStart()
		if movesBitmap[index] then
			anyMatch = true
		end
	end

	if not anyMatch then --no move wants to start
		return false
	end

	local selectedIndex = RouletteWheelSelection.decide("Moves", #moves, movesBitmap)
	selectedMove = moves[selectedIndex]
	offsetTable = {}
	offsetTableSize = 0
	if not selectedMove.excludeKeeper() or World.FriendlyKeeper ~= self._robot then
		self._send.standardMoveFlag("all")
	end
	return false
end

function Move:_updateTask()
	selectedMove.run(self)
	return selectedMove.updateTask(self._offset)
end

return Move
