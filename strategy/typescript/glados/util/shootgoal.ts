import * as Cache from "base/cache";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as Referee from "base/referee";
import { FriendlyRobot } from "base/robot";
import { Position, Speed, Vector } from "base/vector";
import * as World from "base/world";
let G = World.Geometry;

import * as Ball from "glados/observer/ball";
import * as Goal from "glados/observer/goal";
import * as Robot from "glados/observer/robot";
import { volleyPossible } from "glados/observer/shoot";
import { Interval } from "glados/util/interval";

interface FutureRobot {
	pos: Position;
	speed: Speed;
	radius: number;
	isFriendly: boolean;
}

type GetRobotLists = (ownRobot: Readonly<FriendlyRobot>) => [FutureRobot[], FutureRobot[]];
/**
 * Returns the lists of interfering robots (with and without the keeper)
 * @see _getRobotLists
 * @param ownRobot - The robot that will shoot the ball
 * @returns The list of all interfering robots
 * @returns The above list without the opponent keeper
 */
export const getRobotLists: GetRobotLists = Cache.forFrame((ownRobot) => {
	// constant extrapolation time
	// after this reaction time the robots tend to block the shot
	// thus further extrapolation does not really make sense
	let extrapolationTime = 0.2;
	let averageKickedBallSpeed = 6;

	let robotList: FutureRobot[] = [];
	let robotListWithoutKeeper: FutureRobot[] = [];

	// consider all robots (also our ones)
	for (let r of World.Robots) {
		/* This is erroneously flags Readonly<FriendlyRobot> and Robot as
		 * having no overlap
		 * TODO Remove this once #819/#820 are fixed
		 */
		// @ts-ignore
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
});

/**
 * Returns a rating for a given sector, prioritizing already chosen ones
 * @param sector - The sector to rate
 * @param oldSectorMid - The position that was chosen in the last frame
 * @returns The rating
 */
export function rateSector(sector: Readonly<Interval<unknown>>, oldSectorMid?: number): number {
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
export function findTarget(ownRobot: Readonly<FriendlyRobot>, viewPos: Readonly<Position>, ignoreGoalie: boolean,
		oldTarget?: Readonly<Position>): [Position, number] {
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

type UpdateTarget =
	(ownRobot: Readonly<FriendlyRobot>, oldTarget: Readonly<Position> | undefined, oldDirty: boolean, attackPosition?: Readonly<Position>)
		=> [Position, number, boolean];

const TIME_UNTIL_MIN_ANGLE = 5;
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
export const updateTarget: UpdateTarget = Cache.forFrame((ownRobot, oldTarget, oldDirty, attackPosition) => {
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
});

type ShootGoalPossible = (robot: FriendlyRobot, attackPosition?: Readonly<Position> | undefined)
	=> [boolean, number | undefined];

export const shootGoalPossible: ShootGoalPossible = Cache.forFrame((robot, attackPosition) => {
	const [sg_target, angle, sg_dirty] = updateTarget(robot, undefined, false, attackPosition);

	if (sg_dirty) {
		return [false, angle];
	}

	if (Referee.hasTooManyFriendlyRobots()) {
		return [false, undefined];
	}

	if (World.Ball.speed.length() > 1.2) {
		return [volleyPossible(robot, sg_target), undefined];
	}

	if (attackPosition != undefined && Field.distanceToOpponentDefenseArea(attackPosition, 0) > 1
			&& Robot.isPressed(robot, attackPosition)) {
		return [false, angle];
	}

	return [true, angle];
});
