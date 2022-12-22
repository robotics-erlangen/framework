import * as Cache from "base/cache";
import * as Constants from "base/constants";
import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import * as Referee from "base/referee";
import { FriendlyRobot } from "base/robot";
import { Position, Speed, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";
const G = World.Geometry;

import * as Ball from "glados/observer/ball";
import * as Crash from "glados/observer/crash";
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
	let maxExtraAngle = geom.degreeToRadian(1.5);
	let dirtyCheckAngle = geom.degreeToRadian(2.5) + maxExtraAngle * Math.max(0, 1 - ballOwnershipDuration / TIME_UNTIL_MIN_ANGLE);
	// log("dirtyCheckAngle: "+tostring(dirtyCheckAngle/Math.PI * 180))
	let dirtyCheckAngleHysteresis = geom.degreeToRadian(0.3);
	let dirty = targetWidth < dirtyCheckAngle - dirtyCheckAngleHysteresis ||
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

	if (Crash.isCrashed()) {
		return [true, angle];
	}

	/* Far shots seldom hit the goal, however don't want to be too cautious. A
	 * better variant would be to
	 * - Calculate the time it takes for an opponent to block the shot
	 * - Compare that to the time the ball needs to travel
	 * For now, this shall do
	 */
	let attackPos = attackPosition != undefined ? attackPosition : robot.pos;
	let hitLikelyhood = shootGoalLikelyhood(attackPos, sg_target);
	vis.addPath("shootGoalLikelyhoodZone", [robot.pos, sg_target], vis.colors.skyBlueHalf, false, undefined, 0.1);
	debug.set("goalLikelyhood", hitLikelyhood);
	if (hitLikelyhood < 0.5) {
		return [false, angle];
	}

	if (World.Ball.speed.length() > 1.2) {
		return [volleyPossible(robot, sg_target), undefined];
	}

	if (attackPosition != undefined && Field.distanceToOpponentDefenseArea(attackPosition, 0) > 1
			&& Robot.isPressed(robot, attackPosition)) {
		return [false, angle];
	}
	if (attackPosition == undefined) {
		attackPosition = robot.pos;
	}

	return [true, angle];
});

function getInterceptAcceleration(position: Position, speed: Vector, robotRadius: number, attackPosition: Position, dirShoot: Vector): number {
	let closestPoint = (position - attackPosition).dot(dirShoot) * dirShoot + attackPosition;
	if (Field.isInDefenseArea(closestPoint, robotRadius, false)) {
		closestPoint = Field.limitToAllowedField(closestPoint, 0);
	}
	let tAtPos = (closestPoint - attackPosition).length() / Constants.maxBallSpeed;
	if (tAtPos <= 0.01) {
		return 0;
	}
	let distance = closestPoint - position;
	let result = (distance - speed * tAtPos).length() / (tAtPos * tAtPos);
	return result;
}

function shootGoalLikelyhood(attackPosition: Position, sgTarget: Position): number {
	let tAttack = (attackPosition - World.Ball.pos).length() / World.Ball.speed.length();
	const maxVelocityApprox = 3.5;
	let vecShoot = sgTarget - attackPosition;
	let distanceShoot = vecShoot.length();
	let tShoot = distanceShoot / Constants.maxBallSpeed;
	let dirShoot = vecShoot / distanceShoot;

	let endRange = new Vector(maxVelocityApprox, 0) * tShoot;
	let upperBound = sgTarget + endRange;
	let lowerBound = sgTarget - endRange;

	let likelyhoodToBeIntercepted = 0;
	for (let robot of World.OpponentRobots) {
		let futurePosition: Vector = robot.pos + robot.speed * tAttack;
		if (robot !== World.OpponentKeeper
			&& (geom.isInTriangle(attackPosition, lowerBound, upperBound, robot.pos) || geom.isInTriangle(attackPosition, lowerBound, upperBound, futurePosition))) {
			// try to estimate the likelyhood of a opponent robot to intercept the ball
			// by approximating the necessary acceleration to achieve that
			let currentApprox = getInterceptAcceleration(robot.pos, robot.speed, robot.radius, attackPosition, dirShoot);
			let futureApprox = getInterceptAcceleration(futurePosition, robot.speed, robot.radius, attackPosition, dirShoot);
			let pessimisticApprox = Math.min(currentApprox, futureApprox);
			const maxAccelerationApprox = 7;
			let interceptLikelyhood = 1 - (Math.min(pessimisticApprox, maxAccelerationApprox) / maxAccelerationApprox);
			likelyhoodToBeIntercepted += interceptLikelyhood;
		}
	}
	let maxLikelyhoodToBeIntercepted = Constants.maxTeamSize[World.DIVISION] / 2;
	const maxDistance = 6; // if the distance is > than maxDistance we assume the kick has no chance of hitting the goal
	const dangerousDistance = 2.5; // if the distance is smaller than dangerousDistance we assume that the chances of hitting the goal are high
	let distanceScaleFactor = 1 - MathUtil.bound(0, (distanceShoot - dangerousDistance) / (maxDistance - dangerousDistance), 1);
	return distanceScaleFactor * (1 - Math.min(likelyhoodToBeIntercepted, maxLikelyhoodToBeIntercepted) / maxLikelyhoodToBeIntercepted);
}
