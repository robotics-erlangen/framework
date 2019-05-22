import * as Entrypoints from "base/entrypoints";

import { MainCoordinator } from "glados/control/maincoordinator";
import { CenterBack as CenterBackGroup } from "glados/group/centerback";
import { Midfield as MidfieldGroup } from "glados/group/midfield";
import { Move } from "glados/group/move/base";
import { Moves as MoveGroup } from "glados/group/moves";
import { Striker as StrikerGroup } from "glados/group/striker";
// test moves
import { DribbleTest } from "glados/test/move/dribbletest";
import { MovingObstacles } from "glados/test/move/movingobstacles";
import { Victory } from "glados/test/move/victory";
import { MainTrainer } from "glados/trainer/maintrainer";


let moves: (typeof Move)[] = [
	Victory,
	MovingObstacles,
	DribbleTest
];

let coord: MainCoordinator | undefined = undefined;
function createEntrypoint(move: typeof Move) {
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
	};
}

for (let move of moves) {
	Entrypoints.add("MoveTest/"  + move.name, createEntrypoint(move));
}
