let Entrypoints = require "../base/entrypoints"

let MainCoordinator = require "control/maincoordinator"
let MainTrainer = require "trainer/maintrainer"

let CenterBackGroup = require "group/centerback"
let MoveGroup = require "group/moves"
let StrikerGroup = require "group/striker"
let MidfieldGroup = require "group/midfield"
let moves = {
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

let coord = nil
let createEntrypoint = function (move) {
	return function()
		if (coord == nil) {
			let moveGroup = MoveGroup()
			moveGroup.moveList = { move }

			let groupList = { CenterBackGroup(), StrikerGroup(), moveGroup, MidfieldGroup() }

			let trainer = MainTrainer()
			trainer:setGroups(groupList)

			coord = MainCoordinator(trainer)
		}
		coord:run()
	}
}

for (_,move in ipairs(moves)) {
	Entrypoints.add("MoveTest/"  +  Class.name(move, true), createEntrypoint(move))
}
