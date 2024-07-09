import * as Entrypoints from "base/entrypoints";

import { MainCoordinator } from "glados/control/maincoordinator";
import { CenterBack as CenterBackGroup } from "glados/group/centerback";
import { Move } from "glados/group/move/base";
import { Moves as MoveGroup } from "glados/group/moves";
import { Support as SupportGroup } from "glados/group/support";
// test moves
import { TrajectoryTiming as TrajectoryTimingTask } from "glados/task/test/trajectorytiming";
import { DribbleTest } from "glados/test/move/dribbletest";
import { FeintKeeperTest } from "glados/test/move/feintkeepertest";
import { InterceptPassMove } from "glados/test/move/interceptpass";
import { MovingObstacles } from "glados/test/move/movingobstacles";
import { Race } from "glados/test/move/race";
import { Rotate } from "glados/test/move/rotate";
import { makeSingleTaskMove } from "glados/test/move/singletaskmove";
import { TIGERsTestGoalShot } from "glados/test/move/tigerstestgoalshot";
import { Victory } from "glados/test/move/victory";
import { Volley } from "glados/test/move/volley";
import { RotTest } from "glados/test/task/rotation";
import { AttackRatioKind, ValidAttackRatio } from "glados/trainer/attackratio";
import { MainTrainer } from "glados/trainer/maintrainer";


let moves: (typeof Move)[] = [
	Victory,
	MovingObstacles,
	DribbleTest,
	Race,
	Rotate,
	makeSingleTaskMove(TrajectoryTimingTask),
	Volley,
	makeSingleTaskMove(RotTest),
	InterceptPassMove,
	makeSingleTaskMove(TIGERsTestGoalShot),
	FeintKeeperTest
];

let coord: MainCoordinator | undefined = undefined;
export function createEntrypoint(move: typeof Move) {
	return function() {
		if (coord == undefined) {
			let moveGroup = new MoveGroup([move]);

			let groupList: any[] = [new CenterBackGroup(), new SupportGroup(), moveGroup];

			let trainer = new MainTrainer({
				kind: AttackRatioKind.ConstantAttackers,
				numberOfAttackers: <ValidAttackRatio> move.MIN_ROBOTS,
			});
			trainer.setGroups(groupList);

			coord = new MainCoordinator(trainer);
		}
		coord.run();
		return false;
	};
}

for (let move of moves) {
	let name = move.NAME === "" ? move.name : move.NAME;
	Entrypoints.add(`MoveTest/${name}`, createEntrypoint(move));
}
