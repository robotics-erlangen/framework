import * as Cache from "base/cache";
import * as geom from "base/geom";
import { FriendlyRobot } from "base/robot";
import { Position, Speed, Vector } from "base/vector";
import * as World from "base/world";
let G = World.Geometry;

import * as Ball from "glados/observer/ball";
import * as Goal from "glados/observer/goal";
import { Interval } from "glados/util/interval";

interface FutureRobot {
	pos: Position;
	speed: Speed;
	radius: number;
	isFriendly: boolean;
}

function _getRobotLists(ownRobot: FriendlyRobot): [FutureRobot[], FutureRobot[]] {
	// constant extrapolation time
	// after this reaction time the robots tend to block the shot
	// thus further extrapolation does not really make sense
	let extrapolationTime = 0.2;
	let averageKickedBallSpeed = 6;

	let robotList: FutureRobot[] = [];
	let robotListWithoutKeeper: FutureRobot[] = [];

	// consider all robots (also our ones)
	for (let r of World.Robots) {
		if (r !== ownRobot) {
			// crude estimate of how much time the robot has before the ball has passed it
			// robots near the ball won't have moved for the full extrapolation time by then
			let ballTimeToRobot = r.pos.distanceTo(World.Ball.pos) / averageKickedBallSpeed;
			let futureRobot = { pos: r.pos + r.speed * Math.min(ballTimeToRobot, extrapolationTime),
				radius: r.radius, speed: r.speed, isFriendly: r.isFriendly };

			robotList.push(futureRobot);
			if (r !== World.OpponentKeeper) {
				robotListWithoutKeeper.push(futureRobot);
			}
		}
	}
	return [robotList, robotListWithoutKeeper];
}
/**
 * Returns the lists of interfering robots (with and without the keeper)
 * @see _getRobotLists
 * @param ownRobot - The robot that will shoot the ball
 * @returns The list of all interfering robots
 * @returns The above list without the opponent keeper
 */
export let getRobotLists: (ownRobot: FriendlyRobot) => [FutureRobot[], FutureRobot[]] = Cache.forFrame(_getRobotLists);

/**
 * Returns a rating for a given sector, prioritizing already chosen ones
 * @param sector - The sector to rate
 * @param oldSectorMid - The position that was chosen in the last frame
 * @returns The rating
 */
export function rateSector(sector: Interval<any>, oldSectorMid?: number): number {
	let sectorWidth = sector[1] - sector[0];

	let hysteresisFactor = 1;
	if (oldSectorMid != undefined && oldSectorMid > sector[0] && oldSectorMid < sector[1]) {
		hysteresisFactor = 3;
	}

	return sectorWidth * hysteresisFactor;
}

/**
 * looks for an optimal target in the opponent goal
 * @param ownRobot - The robot that will shoot the ball
 * @param viewPos - The position the ball is shot from
 * @param ignoreGoalie - Whether the keeper should be ignored
 * @param oldTarget - The target position that was chosen in the last frame
 * @returns The midpoint of the chosen sector
 * @returns The witdh of the chosen sector
 */
export function findTarget(ownRobot: FriendlyRobot, viewPos: Position, ignoreGoalie: boolean,
		oldTarget?: Position): [Position, number] {
	let goalStart = (G.OpponentGoalRight - viewPos).angle();
	let goalEnd = (G.OpponentGoalLeft - viewPos).angle();

	let ballDiameterAngle = (2 * World.Ball.radius) / G.OpponentGoalRight.distanceTo(viewPos);
	if (viewPos.x > G.OpponentGoalRight.x) {
		goalStart = goalStart + ballDiameterAngle;
	} else if (viewPos.x < G.OpponentGoalLeft.x) {
		goalEnd = goalEnd - ballDiameterAngle;
	}

	if (goalEnd < goalStart) {
		return [G.OpponentGoal, 0];
	}

	// get all free sectors
	let [robotListWithKeeper, robotListWithoutKeeper] = getRobotLists(ownRobot);
	let robotList = ignoreGoalie ? robotListWithoutKeeper : robotListWithKeeper;
	let freeSectors = Goal.getFreeSectors(viewPos, robotList, goalStart, goalEnd);

	// compute angle of old target (used for hysteresis)
	let oldSectorMid: number | undefined = undefined;
	if (oldTarget != undefined) {
		oldSectorMid = (oldTarget - viewPos).angle();
	}

	// find best sector
	let bestRating = 0;
	let bestSectorMid = undefined;
	let bestSectorWidth = 0;
	for (let sector of freeSectors) {
		let rating = rateSector(sector, oldSectorMid);
		if (rating > bestRating) {
			bestRating = rating;
			bestSectorMid = (sector[0] + sector[1]) * 0.5;
			bestSectorWidth = sector[1] - sector[0];
		}
	}

	// calculate target point
	// default to shooting at the goal center
	let targetPoint = G.OpponentGoal;
	if (bestSectorMid != undefined) {
		let intersection = geom.intersectLineLine(viewPos,
			Vector.fromAngle(bestSectorMid), G.OpponentGoal, new Vector(1, 0))[0];
		if (intersection) {
			targetPoint = intersection;
		}
	}

	return [targetPoint, bestSectorWidth];
}

let TIME_UNTIL_MIN_ANGLE = 5;
function _updateTarget(ownRobot: FriendlyRobot, oldTarget: Position | undefined, oldDirty: boolean,
		attackPosition?: Position): [Position, number, boolean] {
	// compute viewPos relative to the current robot pos
	let viewPos = attackPosition || (ownRobot.pos + Vector.fromPolar(ownRobot.dir, ownRobot.shootRadius + World.Ball.radius));

	// search a good target
	let [targetPoint, targetWidth] = findTarget(ownRobot, viewPos, false, oldTarget);

	// update decision if we ignore the goalie and check for ricochets
	let ballOwnershipDuration = Ball.friendlyBallOwnershipDuration();
	let maxExtraAngle = 1.5 / 180 * Math.PI;
	let dirtyCheckAngle = 2.5 / 180 * Math.PI + maxExtraAngle * Math.max(0, 1 - ballOwnershipDuration / TIME_UNTIL_MIN_ANGLE);
	// log("dirtyCheckAngle: "+tostring(dirtyCheckAngle/Math.PI * 180))
	let dirtyCheckAngleHysteresis = 0.3 * Math.PI / 180;
	let dirty = targetWidth < dirtyCheckAngle - dirtyCheckAngleHysteresis  ||
		(oldDirty && targetWidth < dirtyCheckAngle + dirtyCheckAngleHysteresis);

	// search a second time if necessary
	if (dirty) {
		[targetPoint, targetWidth] = findTarget(ownRobot, viewPos, true, oldTarget);
	}

	if (viewPos.y < -0.3 || oldDirty && viewPos.y < -0.1) {
		dirty = true;
	}

	return [targetPoint, targetWidth, dirty];
}
/**
 * Decides on where to shoot
 * @param ownRobot - The robot that will shoot the ball
 * @param oldTarget - The target position that was chosen in the last frame
 * @param oldDirty - Whether the dirty flag was set in the last frame
 * @param attackPosition - If set, use this position instead of robot dribbler
 * @returns The midpoint of the chosen sector
 * @returns The width of the chosen sector
 * @returns The dirty flag
 */
export let updateTarget: (ownRobot: FriendlyRobot, oldTarget: Position | undefined, oldDirty: boolean,
		attackPosition?: Position) => [Position, number, boolean] = Cache.forFrame(_updateTarget);
