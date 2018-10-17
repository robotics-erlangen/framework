import * as Entrypoints from "base/entrypoints";
import {Position, Vector} from "base/vector";

import {MainCoordinator} from "glados/control/maincoordinator";
import {Group} from "glados/trainer/groups";
import {MainTrainer} from "glados/trainer/maintrainer";

import {CenterBack as CenterBackGroup} from "glados/group/centerback";
import {Moves as MoveGroup} from "glados/group/moves";
import {Move} from "glados/group/move/base";
import {Midfield as MidfieldGroup} from "glados/group/midfield";
import {Striker as StrikerGroup} from "glados/group/striker";


// [TODO]

// require "test/move/timetopos",
// require "test/move/chiptime",
// require "test/move/commchallengemaster",
// require "test/move/commchallengeslave",
// require "test/move/goalshot",
// require "test/move/race",
// require "test/move/volley",
// require "test/move/dribble",
// require "test/move/chipdribble",
// require "test/move/interceptpass",
// require "test/move/debugchip",
// require "group/move/fastballplacement",
// require "test/move/movesrc1",
// require "test/move/defense",
// require "test/move/keepertest"

import {Victory} from "glados/test/move/victory";

let moves: (typeof Move)[] = [
	Victory
];

let coord: MainCoordinator | undefined = undefined;
function createEntrypoint (move: typeof Move) {
	return function() {
		if (coord == undefined) {
			let moveGroup = new MoveGroup();
			moveGroup.moveList =  [move];

			let groupList: any[] = [new CenterBackGroup(), new StrikerGroup(), moveGroup, new MidfieldGroup()];

			let trainer = new MainTrainer(undefined);
			trainer._groups.setGroups(groupList);

			coord = new MainCoordinator(trainer);
		}
		coord.run();
		return false;
	}
}

for (let move of moves) {
	Entrypoints.add("MoveTest/"  + move.name, createEntrypoint(move));
}
