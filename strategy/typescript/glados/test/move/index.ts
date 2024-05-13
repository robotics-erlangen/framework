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
import { SimplePass } from "glados/test/move/simplepass";
import { makeSingleTaskMove } from "glados/test/move/singletaskmove";
import { TIGERsTestGoalShot } from "glados/test/move/tigerstestgoalshot";
import { Volley } from "glados/test/move/volley";
import { RotTest } from "glados/test/task/rotation";
import { AttackRatioKind, ValidAttackRatio } from "glados/trainer/attackratio";
import { MainTrainer } from "glados/trainer/maintrainer";
// victory moves
/* eslint-disable import/order */
import { Circle } from "glados/group/move/victory/circle";
import { LoadingCenter, LoadingBack } from "glados/group/move/victory/loading";
import { MovingOwlLogoBack, MovingOwlLogoFull } from "glados/group/move/victory/movinglogo";
/* eslint-enable import/order */

let testMoves: (typeof Move)[] = [
	MovingObstacles,
	DribbleTest,
	Race,
	SimplePass,
	Rotate,
	makeSingleTaskMove(TrajectoryTimingTask),
	Volley,
	makeSingleTaskMove(RotTest),
	InterceptPassMove,
	makeSingleTaskMove(TIGERsTestGoalShot),
	FeintKeeperTest
];
let victoryMoves: (typeof Move)[] = [
	Circle,
	LoadingCenter,
	LoadingBack,
	MovingOwlLogoFull,
	MovingOwlLogoBack,
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

for (let move of testMoves) {
	let name = move.NAME === "" ? move.name : move.NAME;
	Entrypoints.add(`MoveTest/${name}`, createEntrypoint(move));
}

for (let move of victoryMoves) {
	let name = move.NAME === "" ? move.name : move.NAME;
	Entrypoints.add(`VictoryMoves/${name}`, createEntrypoint(move));
}
