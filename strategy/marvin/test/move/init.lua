local Entrypoints = require "../base/entrypoints"

local MainCoordinator = require "control/maincoordinator"
local MainTrainer = require "trainer/maintrainer"

local CenterBackGroup = require "group/centerback"
local MoveGroup = require "group/moves"
local StrikerGroup = require "group/striker"

local moves = {
	require "test/move/timetopos"
}

local coord = nil
local function createEntrypoint(move)
	return function()
		if coord == nil then
			local moveGroup = MoveGroup()
			moveGroup.moveList = { move }

			local groupList = { CenterBackGroup(), StrikerGroup(), moveGroup }

			local trainer = MainTrainer()
			trainer:setGroups(groupList)

			coord = MainCoordinator(trainer)
		end
		coord:run()
	end
end

for _,move in ipairs(moves) do
	Entrypoints.add("MoveTest/" .. Class.name(move, true), createEntrypoint(move))
end