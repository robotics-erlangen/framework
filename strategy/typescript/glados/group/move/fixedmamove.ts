/**************************************************************************
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
**************************************************************************/

import { FriendlyRobot } from "base/robot";
import * as World from "base/world";

import { MessageBox } from "glados/control/messaging";
import { Move } from "glados/group/move/base";

/**
 * Base class for moves that have a single fixed attackager during their lifetime.
 * These are at time of implementation used by the freekick moves and provide a way
 * to select the robots that best match the conditions of the move.
 * The first robot should always be the first robot in the this._robots list, which
 * is ensured by the constructor calling _sortMAFirst, which as a default assumes the most
 * fitting robot to be main attacker is the one closest to the ball.
 */
export abstract class FixedMAMove extends Move {

	// as far as current knowledge goes the FixedMAMoves work fine with extra attackers
	public static readonly ALLOW_EXTRA_ATTACKERS = true;

	public constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);
		this._robots = FixedMAMove._sortMAFirst(this._robots);
	}

	protected static _sortMAFirst(robots: FriendlyRobot[]): FriendlyRobot[] {
		const distanceToBall = robots.map((robot) => [robot, robot.pos.distanceTo(World.Ball.pos)]);
		distanceToBall.sort((robotA, robotB) => <number> robotA[1] - <number> robotB[1]);
		const closestRobot = robots.indexOf(<FriendlyRobot> distanceToBall[0][0]);
		robots[closestRobot] = robots.splice(0, 1, robots[closestRobot])[0];
		return robots;
	}

	protected static _sortRobotsByPriorityMAFirst(robots: FriendlyRobot[], sortRobotsByPriority: (robotList: FriendlyRobot[]) => FriendlyRobot[]): FriendlyRobot[] {
		robots = FixedMAMove._sortMAFirst(robots);
		const mainAttacker = robots[0];
		robots.splice(0, 1);
		robots = sortRobotsByPriority(robots);
		robots.unshift(mainAttacker);
		return robots;
	}

	protected static _sortRobotsByPriorityWithoutMA(robots: FriendlyRobot[]): FriendlyRobot[] {
		return Move.sortRobotsByPriority(robots);
	}

	/**
	 * Uses _sortMAFirst and Move.sortRobotsByPriority as a default implementation.
	 *
	 * IMPORTANT: if you override this make sure that the main attacker you want is
	 * sorted first to make sure it is part of the selected robots.
	 */
	public static sortRobotsByPriority(robots: FriendlyRobot[]): FriendlyRobot[] {
		return FixedMAMove._sortRobotsByPriorityMAFirst(robots, Move.sortRobotsByPriority);
	}
}
