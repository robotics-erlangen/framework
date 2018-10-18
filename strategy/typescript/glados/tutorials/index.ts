
// This file is not relevant for thet tutorial.
// This just creates the entrypoint for the tutorials.
// Feel free to ignore this for now.


import * as Entrypoints from "base/entrypoints";

import { MainCoordinator } from "glados/control/maincoordinator";
import { Group } from "glados/trainer/groups";
import { MainTrainer } from "glados/trainer/maintrainer";

import {CenterBack as CenterBackGroup } from "glados/group/centerback";
import {Midfield as MidfieldGroup } from "glados/group/midfield";
import { Move } from "glados/group/move/base";
import {Moves as MoveGroup } from "glados/group/moves";
import {Striker as StrikerGroup } from "glados/group/striker";

import {Tutorial as Tutorial1 } from "glados/tutorials/t1Move/tutorial";
import { Tutorial2 } from "glados/tutorials/t2Task/tutorial2";

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


Entrypoints.add("Tutorials/Tutorial 1", createEntrypoint(Tutorial1));
Entrypoints.add("Tutorials/Tutorial 2", createEntrypoint(Tutorial2));

