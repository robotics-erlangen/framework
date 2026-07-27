--[[***********************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
*************************************************************************]]

local Entrypoints = require "../base/entrypoints"

local MainCoordinator = require "control/maincoordinator"
local MainTrainer = require "trainer/maintrainer"

local CenterBackGroup = require "group/centerback"
local MoveGroup = require "group/moves"
local StrikerGroup = require "group/striker"
local MidfieldGroup = require "group/midfield"
local moves = {
	require "test/move/timetopos",
	require "test/move/chiptime",
	require "test/move/commchallengemaster",
	require "test/move/commchallengeslave",
	require "test/move/goalshot",
	require "test/move/race",
	require "test/move/volley",
	require "test/move/dribble",
	require "test/move/victory",
	require "test/move/chipdribble",
	require "test/move/interceptpass",
	require "test/move/debugchip",
	require "group/move/fastballplacement",
	require "test/move/movesrc1",
	require "test/move/defense",
	require "test/move/keepertest"
}

local coord = nil
local function createEntrypoint(move)
	return function()
		if coord == nil then
			local moveGroup = MoveGroup()
			moveGroup.moveList = { move }

			local groupList = { CenterBackGroup(), StrikerGroup(), moveGroup, MidfieldGroup() }

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
