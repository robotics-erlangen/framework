import * as Cache from "base/cache";
import * as Constants from "base/constants";
import * as Field from "base/field";
import * as geom from "base/geom";
import { Robot } from "base/robot";
import { Position, Speed, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import * as Ball from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import * as Interval from "glados/util/interval";
import * as Rating from "glados/util/rating";
import * as Volley from "glados/util/volley";


let G = World.Geometry;

/**
 * Returns a list of all non-free sectors.
 * The non-free sectors are not merged and not sorted.
 * The interval has to be oriented counter-clockwise.
 * @param viewPos - Usually Ball.pos
 * @param robotList - All robots that may block the sight
 * @param startAngle - Start angle of the sector to scan
 * @param endAngle - End angle of the sector to scan
 * @param insertRobots - Set to true iff you want the robots included in its sector
 * @returns occupiedSectors All unsorted, unmerged occupied sectors
 */
export function getOccupiedSectors<R extends {pos: Position; radius: number}>(viewPos: Position, robotList: R[],
		startAngle: number, endAngle: number, insertRobots: boolean = false): Interval.Interval<R>[] {
	if (endAngle < startAngle) { // normalize angles
		endAngle = endAngle + 2 * Math.PI;
	}

	let occupiedSectors = [];
	let extraRadius = World.Ball.radius;
	for (let robot of robotList) {
		let toRobot = robot.pos - viewPos; // vector from viewPos to center of robot
		let robotAngleDiff;
		if (robot.radius + extraRadius <= toRobot.length()) {
			robotAngleDiff = Math.asin((robot.radius + extraRadius) / toRobot.length()); // min angle between toRobot and shoot sector
		} else {
			robotAngleDiff = Math.PI / 2; // 90 deg, if the ball touches the robot (asin[-1,1]!)
		}
		let robotAngle = toRobot.angle(); // direction of the robot
		let robotStart = robotAngle - robotAngleDiff; // can be < 0
		let robotEnd = robotAngle + robotAngleDiff; // can be > 2pi
		if (robotStart < endAngle && robotEnd > startAngle) { // if the robot covers a part of the goal
			let resultList: Interval.Interval<R> = [Math.max(robotStart, startAngle), Math.min(robotEnd, endAngle)];
			if (insertRobots) {
				resultList[2] = [robot, robot];
			}
			occupiedSectors.push(resultList); // add the occupied sector to the list
		}
		if (robotStart + 2 * Math.PI < endAngle) { // normalize angles
			// checking for robotEnd + 2*pi > startAngle is not needed, as robotEnd is always >= 0 and startAngle < 2pi
			// and thus is always true
			robotStart = robotStart + 2 * Math.PI;
			robotEnd = robotEnd + 2 * Math.PI;
			let resultList: Interval.Interval<R> = [Math.max(robotStart, startAngle), Math.min(robotEnd, endAngle)];
			if (insertRobots) {
				resultList[2] = [robot, robot];
			}
			occupiedSectors.push(resultList); // add the occupied sector to the list
		}
	}
	return occupiedSectors;
}

export function getFreeSectors<R extends {pos: Position; radius: number}>(viewPos: Position, robotList: R[],
		startAngle: number, endAngle: number): Interval.Interval<R>[] {
	if (endAngle < startAngle) { // normalize angles
		endAngle = endAngle + 2 * Math.PI;
	}
	let occupiedSectors = getOccupiedSectors(viewPos, robotList, startAngle, endAngle, false);
	Interval.sort(occupiedSectors); // sort sectors ascending by sectorStart
	Interval.merge(occupiedSectors); // merge the sectors
	return Interval.negate(occupiedSectors, startAngle, endAngle);
}

/**
 * Returns a list of all free sectors
 * @param viewPos - Position from which the free angles should be found
 * @param robotList - All robot objects that should be considered
 * @param opp - True for opponent goal, false for friendly goal
 * @returns a List of free sectors [startAngle, endAngle] ascending by start angle
 */
export function freeSectors<R extends {pos: Position; radius: number}>(viewPos: Position, robotList: R[], opp: boolean): Interval.Interval<R>[] {
	if ((opp ? 1 : -1) * viewPos.y > G.FieldHeightHalf) {
		// log("viewPos is behind the goal.")
		return [];
	}

	let goalStart = ((opp ? G.OpponentGoalRight : G.FriendlyGoalLeft) - viewPos).angle(); // direction of the first goalpost
	let goalEnd = ((opp ? G.OpponentGoalLeft : G.FriendlyGoalRight) - viewPos).angle(); // direction of the other goalpost (is always greater than goalStart, if viewPos is in the field)

	let unoccupiedSectors = getFreeSectors(viewPos, robotList, goalStart, goalEnd);
	// log(tostring(goalEnd - goalStart))
	// returns all unoccupied sectors in the interval [right goalpost, left goalpost]
	return unoccupiedSectors;
}

/**
 * Returns the largest free sector and its width (angle difference)
 * @param viewPos - Position from which the free angles should be found
 * @param robotList - All robot objects that should be considered
 * @param opp - True for opponent goal, false for friendly goal
 * @returns The largest free sector
 */
export function largestFreeSector<R extends {pos: Position; radius: number}>(viewPos: Position, robotList: R[], opp: boolean): Interval.Interval<R> | undefined {
	let unoccupiedSectors = freeSectors(viewPos, robotList, opp); // get list of all unoccupied sectors
	return Interval.getLargest(unoccupiedSectors);
}

/**
 * Returns a list of all sectors not covered by any robot from robotList (not limited to the goal)
 * @param viewPos - Position from which the free angles should be found
 * @param robotList - All robot objects that should be considered
 */
export function allFreeSectors<R extends {pos: Position; radius: number}>(viewPos: Position, robotList: R[]): Interval.Interval<R>[] {
	let occupiedSectors = getOccupiedSectors(viewPos, robotList, 0, 2 * Math.PI);
	// for i,sector in ipairs(occupiedSectors) do
	// 	debug.set("osectors["+i+"]", "{"+sector[1]+", "+sector[2]+"}")
	// end
	let matching = undefined;
	let deleted: number[] = [];
	for (let i = 0;i < occupiedSectors.length;i++) {
		let sector = occupiedSectors[i];
		if (sector[0] === 0) {
			if (matching != undefined) {
				occupiedSectors[matching] = [occupiedSectors[matching][0], sector[1] + 2 * Math.PI];
				// debug.set("match "+matching+" & "+i, "{"+occupiedSectors[matching][0]+", "+occupiedSectors[matching][1]+"}")
				matching = undefined;
				deleted.push(i);
			} else {
				matching = i;
				// debug.set("match "+i, "start")
				// log("start")
			}
		} else if (sector[1] === 2 * Math.PI) {
			if (matching != undefined) {
				occupiedSectors[matching] = [sector[0], occupiedSectors[matching][1] + 2 * Math.PI];
				// debug.set("match "+matching+" & "+i, "{"+occupiedSectors[matching][0]+", "+occupiedSectors[matching][1]+"}")
				matching = undefined;
				deleted.push(i);
			} else {
				matching = i;
				// debug.set("match "+i, "end")
				// log("end")
			}
		}
	}
	for (let i = deleted.length;i >= 0;i--) {
		occupiedSectors.splice(deleted[i], 1);
	}
	Interval.sort(occupiedSectors);
	// for i,sector in ipairs(occupiedSectors) do
	// 	debug.set("O2sectors["+i+"]", "{"+sector[1]+", "+sector[2]+"}")
	// end
	Interval.merge(occupiedSectors);
	// for i,sector in ipairs(occupiedSectors) do
	// 	debug.set("MOsectors["+i+"]", "{"+sector[1]+", "+sector[2]+"}")
	// end
	let freeSectors = Interval.negate(occupiedSectors, -42, 1337); // magic constants, don't change!
	if (freeSectors.length > 2) {
		let first = freeSectors[0];
		let last = freeSectors[freeSectors.length - 1];
		// log(#freeSectors)
		// for i,sector in ipairs(freeSectors) do
		// 	debug.set("Fsectors["+i+"]", "{"+sector[1]+", "+sector[2]+"}")
		// end
		freeSectors[0] = [last[0], first[1]];
		freeSectors.pop();
	} else if (freeSectors.length > 1) { // exactly 2 halfs (that are actually 1 sector, but with a sign flip)
		let first = freeSectors[0];
		let second = freeSectors[1];
		freeSectors = [[second[0], first[1]]];
		// for i,sector in ipairs(freeSectors) do
		// 	debug.set("Fsectors["+i+"]", "{"+sector[1]+", "+sector[2]+"}")
		// end
	} else {// no free sector
		freeSectors = [];
	}
	// remove sectors that are broader than 2pi
	for (let i = freeSectors.length - 1;i >= 0;i--) {
		if (Math.abs(freeSectors[i][1] - freeSectors[i][0]) > 2 * Math.PI) {
			freeSectors.splice(i, 1);
		}
	}
	return freeSectors;
}

let oldRobotPositions: Map<Robot, Position> = new Map<Robot, Position>(); // robot -> position
let lastRawdataBallPos = World.Ball.pos;
function updateRobotPositions() {
	if (World.Ball.hasRawData) {
		lastRawdataBallPos = World.Ball.pos;
		for (let robot of World.OpponentRobots) {
			oldRobotPositions.set(robot, robot.pos);
		}
	}
}

function getInvisibleBallPrediction(): [Position | undefined, Speed | undefined, Robot] | [] {
	// basically invisible ball
	if (World.Ball.detectionQuality < 0.05) {
		// get the last tracked ball state

		// check if it is close to the defense area
		let MAX_DEFENSE_DIST = 2.5;
		if (Field.distanceToFriendlyDefenseArea(lastRawdataBallPos, 0) > MAX_DEFENSE_DIST  &&
				Field.distanceToFriendlyDefenseArea(World.Ball.pos, 0) > MAX_DEFENSE_DIST) {
			return [];
		}

		// TODO: check for fast ball and save predictShot
		// if not Ball.isSlowBall() then
		// end

		// search for robots that were close at that point in time
		let closestRobot = undefined;
		let closestDistance = 0.5; // no robots farther away from the ball than that
		let closestDribblerPos, closestBallSpeed;
		for (let robot of World.OpponentRobots) {
			if (oldRobotPositions[robot] == undefined) {
				break;
			}
			let oldDistance = oldRobotPositions[robot]!.distanceTo(lastRawdataBallPos);
			let newDistance = robot.pos.distanceTo(lastRawdataBallPos);
			if (oldDistance < closestDistance || newDistance < closestDistance) {
				// it has to roughly point at the goal
				let robotDir = Vector.fromAngle(robot.dir);
				// as the robot might be dribbling the ball, use volley prediction
				// TODO: check if that is really a good idea! When using a relative speed of 0, volley calculations are useless.
				// This can be different in the future.
				// FIXME: volley for moving robots does not consider the friction of the carpet, because it is calculating everything
				// in robot coordinates
				// robot.speed as param for ballspeed is choosen, because that is the best estimate if there is no visible ball
				let v_out = Volley.calcVOutTeamCoordinates(Constants.maxBallSpeed, robot.speed, robot.dir, robot.speed, "opp");

				if (v_out === undefined) {
					v_out = Volley.calculateMinimalVOutTeamCoordinates(robot.speed, robot.dir, robot.speed, "opp");
				}

				let ballSpeed = new Vector(v_out[0], v_out[1]);
				let dribblerPos = robot.pos + robotDir.withLength(robot.shootRadius);
				let intersection = geom.intersectLineLine(G.FriendlyGoal, new Vector(1, 0),
					dribblerPos, ballSpeed)[0];
				if (intersection && Math.abs(intersection.x) < G.GoalWidth / 2 + 0.3) {
					closestDistance = Math.min(oldDistance, newDistance);
					closestRobot = robot;
					closestDribblerPos = dribblerPos;
					closestBallSpeed = ballSpeed;
				}
			}
		}

		if (!closestRobot) {
			return [];
		}
		return [closestDribblerPos, closestBallSpeed, closestRobot];
	}
	return [];
}

let BEST_ROBOT_HYSTERESIS = 1.1;
let lastBestRobotId: number | undefined = undefined;
interface PassReceiver {
	robot: Robot;
	dist: number;
	ballTime: number;
	catchPos: Position;
}
function comparePrediction(p1: PassReceiver, p2: PassReceiver): number {
	if (p1.dist === p2.dist) {
		return p1.ballTime - p2.ballTime;
	}
	return p2.dist - p1.dist;
}
function _predictShot(allShots: boolean = false, includeInvisible: boolean = true): [Position, Speed, boolean, PassReceiver[] | undefined, boolean] {
	if (includeInvisible) {
		// check for bad vision
		let [invisibleBallPos, invisibleBallSpeed, oppRobot] = getInvisibleBallPrediction();
		if (invisibleBallPos) {
			vis.addCircle("o/goal: predictShot: invisible ball", oppRobot!.pos, oppRobot!.radius, vis.colors.white, false);
			vis.addPath("o/goal: predictShot: invisible ball", [oppRobot!.pos, oppRobot!.pos + invisibleBallSpeed! * 10], vis.colors.white);
			return [invisibleBallPos, invisibleBallSpeed!, true, undefined, true];
		}
	}

	let ballSpeed = World.Ball.speed; // Defend ball by default
	let pos = World.Ball.pos;
	let isShot = false;
	let isDribbling = false;
	let passReceivers = [];

	let oppBallOwner = Ball.opponentBallOwner();
	let oppBallDribbler = Ball.opponentBallDribbler();
	if (oppBallDribbler && World.RefereeState !== "Stop") {
		isShot = true;
		isDribbling = true;
		// NOTE: use World.Ball instead of futureBall is fine, as the shot is assumed to be imminent.
		let relativeSpeedLength = World.Ball.speed - oppBallDribbler.speed;
		let [dirx, diry] = Volley.calcVOutFromVOutAbs(Constants.maxBallSpeed, relativeSpeedLength.length(), oppBallDribbler.dir, relativeSpeedLength.angle(), "opp");
		ballSpeed = (new Vector(dirx, diry) + oppBallDribbler.speed).normalized();
		if (!allShots) {
			vis.addCircle("o/goal: predictShot: dribbling robot", oppBallDribbler.pos, oppBallDribbler.radius, vis.colors.blue, false);
			vis.addPath("o/goal: predictShot: dribbling robot", [oppBallDribbler.pos, oppBallDribbler.pos + ballSpeed * 10], vis.colors.blue);
		}
	} else if (oppBallOwner != undefined && Ball.isSlowBall()) {
		// if opponent is close to ball use its orientation
		ballSpeed = Vector.fromAngle(oppBallOwner.dir);
		isDribbling = true;
	} else if (!Ball.isSlowBall()) {
		// FIXME as the ball is moving also use pass check if it slightly misses the goal
		// TODO check whether an opponent robot may deflect the ball inside the keeper area?
		// check if there's a robot which may recieve the pass

		// calculate the last point at which a volley with 75 degree angle is still possible
		let usedGoalPost = World.Geometry.FriendlyGoalLeft;
		if (World.Ball.speed.x < 0) {
			usedGoalPost = World.Geometry.FriendlyGoalRight;
		}
		let ballLineDistance = Math.abs(usedGoalPost.orthogonalDistance(pos, pos + ballSpeed));
		let ballLinePos = usedGoalPost.orthogonalProjection(pos, pos + ballSpeed)[0];
		let volleyPosDistance = ballLineDistance / Math.tan(Math.PI * 75 / 180);
		let volleyPos = ballLinePos + ballSpeed.withLength(volleyPosDistance);
		if (!allShots) {
			vis.addCircle("o/goal: predictShot: last volley pos", volleyPos, 0.1);
		}

		if (allShots || Field.isInField(volleyPos, 0)) { // if a volley is possible
			let lengthOfBallMovement = 0.5 * ballSpeed.lengthSq() / (-World.BallModel.BallDeceleration);
			let lineSegments = Field.allowedLineSegments(pos, ballSpeed, lengthOfBallMovement);
			if (!allShots) {
				for (let line of lineSegments) {
					vis.addPath("o/goal: predictShot: allowed catch path", [line[0], line[1]], vis.colors.cyan);
				}
			}

			for (let robot of World.OpponentRobots) {
				let bestPointOnLine = World.Ball.pos;
				let bestPointDistance = Infinity;
				for (let lineSegment of lineSegments) {
					let pointOnLine = robot.pos.nearestPosOnLine(lineSegment[0], lineSegment[1]);
					let distance = robot.pos.distanceTo(pointOnLine);
					if (distance < bestPointDistance) {
						bestPointDistance = distance;
						bestPointOnLine = pointOnLine;
					}
				}
				if (!allShots && Math.sin(robot.dir) > 0) {
					continue;
				}
				let ballRollTime = Physics.checkedBallRollTime(World.Ball, bestPointOnLine);
				let offsetLength = Math.min(robot.shootRadius + World.Ball.radius, robot.pos.distanceTo(bestPointOnLine));
				let catchPos = bestPointOnLine + (robot.pos - bestPointOnLine).withLength(offsetLength);

				// calculate chance of the robot reaching catchPos before the ball
				let weightedDistance;
				if (Math.abs(ballRollTime) === Infinity) {
					weightedDistance = 0;
				} else if (robot.pos.distanceTo(catchPos) < 0.1) {
					weightedDistance = 100000000; // very large number smaller than Infinity
				} else {
					let robotTime = Physics.robotTimeToPos(robot, catchPos, new Vector(robot.maxSpeed, 0))[0];
					weightedDistance = Rating.valueToRating(robotTime, ballRollTime, 0) * 1 / pos.distanceTo(catchPos);
				}
				if (robot.id === lastBestRobotId && weightedDistance > 0) {
					weightedDistance = weightedDistance * BEST_ROBOT_HYSTERESIS;
				}
				if ((robot.pos.distanceTo(World.Ball.pos)) < robot.shootRadius) {
					weightedDistance = Infinity;
				}

				if (weightedDistance > 0) {
					passReceivers.push({robot: robot, dist: weightedDistance, ballTime: ballRollTime,
						catchPos: catchPos});
					if (!allShots) {
						vis.addPath("o/goal: predictShot: to catch position", [robot.pos, catchPos], vis.colors.red);
					}
				}
			}
			passReceivers.sort(comparePrediction);

			if (passReceivers.length > 0) { // if there is a pass receiver, just block it
				let passReceiver = passReceivers[0];
				lastBestRobotId = passReceiver.robot.id;
				pos = passReceiver.catchPos;
				let ballRollTime = Physics.ballRollTime(World.Ball, World.Ball.pos.distanceTo(pos));
				// assume that the opponent will try to stop for the volley and brake from now
				// TODO: Don't use 4 m/s*s as constant, at least not hidden like this
				let oppBrakeSpeed = Math.max(0, passReceiver.robot.speed.length() - 4 * ballRollTime);
				let minRobotSpeed = passReceiver.robot.speed.withLength(oppBrakeSpeed);
				let futureBallSpeed = Physics.ballAtTime(World.Ball, ballRollTime).speed;
				// TODO: Check what happens if futureBallSpeed.length() is zero
				let robotAngle = passReceiver.robot.dir;
				let v_out = Volley.calcVOutTeamCoordinates(Constants.allowedMaxBallSpeed, futureBallSpeed, robotAngle,
					minRobotSpeed, "opp");
				if (v_out === undefined) {
					v_out = Volley.calculateMinimalVOutTeamCoordinates(futureBallSpeed, robotAngle, minRobotSpeed, "opp");
				}
				ballSpeed = new Vector(v_out[0], v_out[1]).normalized();

				if (ballSpeed.isNan()) {
					throw new Error("ballSpeed NaN in predictShot (fast ball volley)");
				}

				if (!allShots) {
					vis.addPath("o/goal: predictShot: receives pass", [passReceiver.robot.pos, pos], vis.colors.pink);
					vis.addCircle("o/goal: predictShot: receives pass", pos, passReceiver.robot.radius, vis.colors.pink, false);
					vis.addPath("o/goal: predictShot: receives pass", [pos, pos + ballSpeed * 10], vis.colors.pink);
				}
			}
		}
		isShot = true;
	} else {
		// otherwise use center of directions to goal posts
		// FIXME: check
		let left = (World.Geometry.FriendlyGoalLeft - World.Ball.pos).normalized();
		let right = (World.Geometry.FriendlyGoalRight - World.Ball.pos).normalized();
		ballSpeed = left + right;
	}

	return [pos, ballSpeed, isShot, passReceivers, isDribbling];
}
/**
 * Predicts the direction the ball will be shot into.
 * Checks for ball movement, opponents near the ball, tries to predict passes
 * @param allShots - Whether or not to only count shots that can volley onto the goal and might hit the goal
 * @param includeInvisible
 * @returns pos Origin of movement
 * @returns dir Ball movement direction and speed
 * @returns isShot If the ball is fast (and should be considered as a threat)
 * @returns passReceivers List of all robots that could receive the pass
 */
export let predictShot = Cache.forFrame(_predictShot);

export function _update() {
	updateRobotPositions();
}
