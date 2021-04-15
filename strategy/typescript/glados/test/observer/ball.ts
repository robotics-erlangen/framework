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
let lastShootRobotPos: Position | undefined  = undefined;

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
