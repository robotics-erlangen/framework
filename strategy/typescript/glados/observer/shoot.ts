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

import * as geom from "base/geom";
import { FriendlyRobot } from "base/robot";
import { Position } from "base/vector";
import * as World from "base/world";

import * as Ball from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import * as Rating from "glados/util/rating";

const MIN_PASS_SPEED = 2.5;
export function ballPassTime(shootPos: Position, passPos: Position, targetRobot: FriendlyRobot | undefined,
		destSpeedLength: number | undefined, shootRobot: FriendlyRobot): number {
	let dist = shootPos.distanceTo(passPos);
	if (destSpeedLength == undefined) {
		destSpeedLength = targetRobot ? targetRobot.constants.passSpeed : MIN_PASS_SPEED;
	}
	let shootSpeed = Physics.calculateShootSpeed(shootRobot, destSpeedLength, dist, false);
	let shootBall = {
		pos: shootPos,
		speed: (passPos - shootPos).withLength(shootSpeed),
		maxSpeed: shootSpeed,
		radius: World.Ball.radius
	};
	return Physics.ballRollTime(shootBall, dist);
}

export function volleyPossible(passRobot: FriendlyRobot, targetPos: Position): boolean {
	if (Ball.receivesPass(passRobot)) {
		let volleyAngle = (targetPos - passRobot.pos).absoluteAngleDiff(World.Ball.pos - passRobot.pos);
		if (volleyAngle < geom.degreeToRadian(66)) {
			return true;
		}
	}
	return false;
}

/**
 * Checks if the line between shootPos and destPos is blocked by opponent robots
 * @param shootPos - The start point of the pass line
 * @param destPos - The end point of the pass line
 * @param chipDistanceFactor - The percentage of the pass distance at which the chipkick reaches the ground
 * @param isFreekickLike - In a freekick like state, the beginning of the corridor is wider
 */
export function evaluatePassCorridor(shootPos: Position, destPos: Position, chipDistanceFactor: number = 0.55,
		isFreekickLike: boolean): "linear" | "chip" | "blocked" {
	let corridorFree = true;
	let passDistSq = shootPos.distanceToSq(destPos);
	for (let r of World.OpponentRobots) {
		let robotPos = r.pos + r.speed * 0.2;
		if (robotPos.distanceToSq(shootPos) < passDistSq && robotPos.distanceToSq(destPos) < passDistSq) {
			let [projection, signedDistToLine] = robotPos.orthogonalProjection(shootPos, destPos);
			let corridorWidth = 0.01;
			if (isFreekickLike) {
				let distToShot = shootPos.distanceTo(projection);
				corridorWidth = Rating.valueToRating(distToShot, 1.1, 0.8) * 0.16 + 0.01;
			}
			if (Math.abs(signedDistToLine) < r.radius + World.Ball.radius + corridorWidth) {
				corridorFree = false;
				let passDist = Math.sqrt(passDistSq);
				let projDistRatio = projection.distanceTo(shootPos) / passDist;
				if (projDistRatio > chipDistanceFactor) {
					return "blocked";
				}
			}
		}
	}
	return corridorFree ? "linear" : "chip";
}
