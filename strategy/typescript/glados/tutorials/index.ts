/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V., Tobias Heineken                *
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
**************************************************************************/


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
import { Tutorial1 as Tutorial1 } from "glados/tutorials/t1Move/tutorial1";
import { TaskRunner as Tutorial2 } from "glados/tutorials/t2Task/taskrunner";
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

