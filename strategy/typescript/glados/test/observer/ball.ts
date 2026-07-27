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

import { Position } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import * as Ball from "glados/observer/ball";

export function testBallOwner() {
	const fowner = Ball.friendlyBallOwner();
	if (fowner) {
		vis.addCircle("test: Ball Owner", fowner.pos, 0.2, vis.colors.skyBlueHalf, true);
	}

	const oowner = Ball.opponentBallOwner();
	if (oowner) {
		vis.addCircle("test: Ball Owner", oowner.pos, 0.2, vis.colors.blueHalf, true);
	}
}

export function testReceivesPass() {
	for (const robot of World.OpponentRobots) {
		const color = Ball.receivesPass(robot) ? vis.colors.orangeHalf : vis.colors.skyBlueHalf;
		vis.addCircle("test: ReceivesPass", robot.pos, 0.2, color, true);
	}
}

let isShotCooldown = 0.3;
let lastShootTime = 0;
let lastShootRobotPos: Position | undefined = undefined;

export function testIsShot() {
	const r = Ball.isShot();
	if (r) {
		lastShootTime = World.Time;
		lastShootRobotPos = r.pos;
	}
	if (World.Time <= lastShootTime + isShotCooldown) {
		vis.addCircle("test: Is Shot", lastShootRobotPos!, 0.15, vis.colors.magentaHalf, true);
	}
}
