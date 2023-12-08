
// This file is not relevant for thet tutorial.
// This just creates the entrypoint for the tutorials.
// Feel free to ignore this for now.


import * as Entrypoints from "base/entrypoints";

import { MainCoordinator } from "glados/control/maincoordinator";
import { CenterBack as CenterBackGroup } from "glados/group/centerback";
import { Move } from "glados/group/move/base";
import { Moves as MoveGroup } from "glados/group/moves";
import { Support as SupportGroup } from "glados/group/support";
import { Group } from "glados/trainer/groups";
import { MainTrainer } from "glados/trainer/maintrainer";
import { Tutorial as Tutorial1 } from "glados/tutorials/t1Move/tutorial";
import { Tutorial2 } from "glados/tutorials/t2Task/tutentrypoint";
import { BallTeleporter as Tutorial3 } from "glados/tutorials/t3Ball/ballteleporter";

let coord: MainCoordinator | undefined = undefined;
function createEntrypoint(move: typeof Move) {
	return function() {
		if (coord == undefined) {
			let moveGroup = new MoveGroup([move]);

			let groupList: any[] = [new CenterBackGroup(), new SupportGroup(), moveGroup];

			let trainer = new MainTrainer(undefined);
			trainer.setGroups(groupList);

			coord = new MainCoordinator(trainer);
		}
		coord.run();
		return false;
	};
}


Entrypoints.add("Tutorials/Tutorial 1", createEntrypoint(Tutorial1));
Entrypoints.add("Tutorials/Tutorial 2", createEntrypoint(Tutorial2));
Entrypoints.add("Tutorials/Tutorial 3", createEntrypoint(Tutorial3));

