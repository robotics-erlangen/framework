import { FriendlyRobot } from "base/robot";
import { Position } from "base/vector";
import * as World from "base/world";

import * as Ball from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import * as Rating from "glados/util/rating";

let MIN_PASS_SPEED = 2.5;
export function ballPassTime(shootPos: Position, passPos: Position, targetRobot: FriendlyRobot | undefined,
		destSpeedLength: number | undefined, shootRobot: FriendlyRobot): number {
	let dist = shootPos.distanceTo(passPos);
	if (destSpeedLength == undefined) {
		destSpeedLength = targetRobot ? targetRobot.constants.passSpeed : MIN_PASS_SPEED;
	}
	let shootSpeed = shootRobot.calculateShootSpeed(destSpeedLength, dist, false);
	let shootBall = {
		pos: shootPos,
		speed: (passPos - shootPos).setLength(shootSpeed),
		maxSpeed: shootSpeed,
		radius: World.Ball.radius
	};
	return Physics.ballRollTime(shootBall, dist);
}

export function volleyPossible(passRobot: FriendlyRobot, targetPos: Position): boolean {
	if (Ball.receivesPass(passRobot)) {
		let volleyAngle = (targetPos - passRobot.pos).absoluteAngleDiff(World.Ball.pos - passRobot.pos);
		if (volleyAngle < 66 * Math.PI / 180) {
			return true;
		}
	}
	return false;
}

/// checks if the line between shootPos and destPos is blocked by opponent robots
// @param shootPos Vector - the start point of the pass line
// @param endPos Vector - the end point of the pass line
// @param chipDistanceFactor number - the percentage of the pass distance at which the chipkick reaches the ground
// @param isFreekickLike bool - in a freekick like state, the beginning of the corridor is wider
// @return string {"linear", "chip", "blocked"}
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
