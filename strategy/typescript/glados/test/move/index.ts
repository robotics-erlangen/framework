import * as Entrypoints from "base/entrypoints";

import { MainCoordinator } from "glados/control/maincoordinator";
import { CenterBack as CenterBackGroup } from "glados/group/centerback";
import { Move } from "glados/group/move/base";
import { Moves as MoveGroup } from "glados/group/moves";
import { Support as SupportGroup } from "glados/group/support";
// test moves
import { TrajectoryTiming as TrajectoryTimingTask } from "glados/task/test/trajectorytiming";
import { DribbleTest } from "glados/test/move/dribbletest";
import { MovingObstacles } from "glados/test/move/movingobstacles";
import { Race } from "glados/test/move/race";
import { makeSingleTaskMove } from "glados/test/move/singletaskmove";
import { Victory } from "glados/test/move/victory";
import { MainTrainer } from "glados/trainer/maintrainer";


let moves: (typeof Move)[] = [
	Victory,
	MovingObstacles,
	DribbleTest,
	Race,
	makeSingleTaskMove(TrajectoryTimingTask)
];

let coord: MainCoordinator | undefined = undefined;
function createEntrypoint(move: typeof Move) {
	return function() {
		if (coord == undefined) {
			let moveGroup = new MoveGroup();
			moveGroup.moveList =  [move];

			let groupList: any[] = [new CenterBackGroup(), new SupportGroup(), moveGroup];

			let trainer = new MainTrainer(undefined);
			trainer._groups.setGroups(groupList);

			coord = new MainCoordinator(trainer);
		}
		coord.run();
		return false;
	};
}

for (let move of moves) {
	let name = move.NAME === "" ? move.name : move.NAME;
	Entrypoints.add("MoveTest/"  + name, createEntrypoint(move));
}
