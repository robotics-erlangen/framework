import * as Field from "base/field";
import * as MathUtil from "base/mathutil";
import { FriendlyRobot } from "base/robot";
import { Position, RelativePosition } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { MessageBox, MessageType } from "glados/control/messaging";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
import { Group } from "glados/trainer/groups";
import * as UtilDefense from "glados/util/defense";
import * as Rating from "glados/util/rating";

const G = World.Geometry;
const adjustWay = World.RULEVERSION === "2018";

function lessthan_intersections(i1: { waypos: number }, i2: { waypos: number }): number {
	return i1.waypos - i2.waypos;
}
function lessthan_targets(t1: { way: number }, t2: { way: number }): number {
	return t1.way - t2.way;
}

function lessthan_robots(r1: { pos: Position }, r2: { pos: Position }): number {
	let a1 = (r1.pos - G.FriendlyGoal).angle();
	let a2 = (r2.pos - G.FriendlyGoal).angle();
	if (a1 < -Math.PI / 2) {
		a1 = a1 + 2 * Math.PI;
	}
	if (a2 < -Math.PI / 2) {
		a2 = a2 + 2 * Math.PI;
	}
	return a2 - a1;
}

interface Target {
	pos: Position;
	time?: number;
	dir?: RelativePosition;
	isShot?: boolean;
}

export interface Point {
	/** The position the centerback should drive to */
	pos: Position;
	/** Usually a ball or a robot */
	target: Target | undefined;
	/** Where to stand on the centerback line */
	way: number;
	/** A relative time until which the target should be reached */
	time?: number;
}

function assignRobotsToPoints(robotList: FriendlyRobot[], pointList: Point[], resultAssignment: Map<FriendlyRobot, Point>,
		necessaryWay: number, isLeft: boolean, delta: number, radius: number) {
	if (isLeft) {
		robotList.reverse();
		pointList.reverse();
	}
	if (robotList.length >= pointList.length) {
		// every point gets a robot, excess robots will be stored next to the necessaryWay. Consider merging problems.
		// to solve merging problems, assign from necessaryWay towards outside. If one target gets overlapped by doing so, the robot will be inserted like the target had never existed.
		let lastWay = necessaryWay;
		let offset = robotList.length - pointList.length;
		for (let i = 0; i < offset; i++) {
			let way = lastWay + delta * (isLeft ? -1 : 1);
			let point = {
				pos: Field.defenseIntersectionByWay(way, radius, true)!,
				target: undefined,
				way: way,
			};
			resultAssignment[robotList[i]] = point;
			lastWay = way;
		}
		let substitutedPoints: Point[] = [];
		for (let i = 0; i < pointList.length; i++) {
			const point = pointList[i];
			if (isLeft) {
				if (point.way > lastWay - delta) {
					let way = lastWay - delta;
					let newPoint = {
						pos: Field.defenseIntersectionByWay(way, radius, true)!,
						target: undefined,
						way: way,
					};
					resultAssignment[robotList[i + offset]] = newPoint;
					lastWay = way;
					substitutedPoints.push(point);
				} else {
					resultAssignment[robotList[i + offset]] = point;
				}
			} else {
				if (point.way < lastWay + delta) {
					let way = lastWay + delta;
					let newPoint = {
						pos: Field.defenseIntersectionByWay(way, radius, true)!,
						target: undefined,
						way: way,
					};
					resultAssignment[robotList[i + offset]] = newPoint;
					lastWay = way;
					substitutedPoints.push(point);
				} else {
					resultAssignment[robotList[i + offset]] = point;
				}
			}
		}
		// check integrity
		if (amun.isDebug) {
			for (let point of pointList) {
				if (Array.from(resultAssignment.values()).indexOf(point) < 0 && substitutedPoints.indexOf(point) < 0) {
					throw new Error(`point that is not covered: ${point}`);
				}
			}
			for (let robot of robotList) {
				if (!resultAssignment.has(robot)) {
					throw new Error(`robot that is not covered: ${robot}`);
				}
			}
		}
	} else {
		// #pointList > #robotList
		// greedely assign robots to points
		// We can use UtilDefense.closestRobotToPos, as closesRobot uses only .pos, which is supplied by every point too
		for (let robot of robotList) {
			let point = UtilDefense.getClosestRobot(pointList, robot.pos)[0];
			// TODO FIXME - point could be undefined
			resultAssignment[robot] = point!;
		}

		if (amun.isDebug) {
			for (let robot of robotList) {
				if (!resultAssignment.has(robot)) {
					throw new Error(`robot that is not covered: ${robot}`);
				}
			}
		}
	}
}

export class CenterBack implements Group {
	public readonly name = "centerback";
	private _lastLocked: boolean = false;

	private _privateCenterBackPositions: Map<FriendlyRobot, { pos: Position; target: Target | undefined; way: number }> = new Map();
	private _centerBackPositions: Map<FriendlyRobot, { pos: Position; target: Target | undefined; way: number; time?: number }> = new Map();

	// TODO: Target are at the moment defined as table that contains a Vector (pos).
	// They should be {pos= Vector, dir=Vector, time = number}
	// where pos is the position in the field that should be covered,
	// dir is the direction that should be used for defenseIntersection
	// time is the time (in s) until the coverage of this position is NECESSARY and therefore a change or a shifted position is not ok
	// dir and time are optional, if they are ommitted, dir will always be G.FriendlyGoal-pos, and time will be Infinity
	// if two targets are both going to be NECESSARY soon, the first NECESSARY target will be covered and other targets will not be considered NECESSARY

	// gets all CB applications as parameter (robot -> target)
	public calculateCenterBackPositions(centerBackApplications: Map<FriendlyRobot, Target>) {
		// important = if the centerbacks should take notice of that robot
		// -> centerBacks move away to let that robot join the defense line
		// -> must not happen to early
		// necessary = if the target should be locked.
		// -> locked targets may not be swapped
		// -> locked targets may not be shifted
		// -> there may be only one necessary target or zero.

		// constants
		let robot_radius = 0.09;
		let distanceToDefenseArea = UtilDefense.centerBackDistanceToDefenseArea();

		// parameters
		let ballDistanceToDefenseArea = Field.distanceToFriendlyDefenseArea(World.Ball.pos, 0);
		let extraDistanceBetweenDefenders = Rating.valueToRating(ballDistanceToDefenseArea, 2, 4) * 0.06;
		let minDistanceBetweenDefenders = 0.01;
		let distanceBetweenDefenders = minDistanceBetweenDefenders + extraDistanceBetweenDefenders;
		if (World.RefereeState === "Stop") {
			distanceBetweenDefenders = Math.max(distanceBetweenDefenders, 0.03);
		}
		let getImportant = 2 * robot_radius + 0.04 + distanceToDefenseArea;

		if (Field.isInFriendlyDefenseArea(World.Ball.pos, World.Ball.radius + 2 * robot_radius + distanceToDefenseArea + 0.4)) {
			distanceBetweenDefenders = 0;
		}

		// idealBot is the bot needed for the necessary target. It is undefined, if no necessary target is needing attention now.
		let idealBot, necessaryWay;
		// collect all important targets and assign them the list of robots
		// only consider those as important that are within a certain range to their destination
		let robots = new Map<Target, FriendlyRobot[]>(); // all targets with their important robots (target -> [robot])
		let robotSet: FriendlyRobot[] = []; // all important robots ([robot])
		let unimportantApplications = new Map<FriendlyRobot, Target>(); // (robot -> target)
		for (let [robot, target] of centerBackApplications) {
			let distToDefenseArea = Field.distanceToFriendlyDefenseArea(robot.pos, robot.radius);
			let important = distToDefenseArea < getImportant;

			// if important: insert the robot in the data structures
			//               for calculating the positions for important robots
			// otherwise: calculate their position after the important ones
			if (important) {
				if (!robots.has(target)) {
					robots[target] = [];
				}
				(robots[target] as FriendlyRobot[]).push(robot);
				robotSet.push(robot);
			} else {
				unimportantApplications[robot] = target;
			}
		}


		// calculate the minimal time that was supplied (all other times are ignored)
		let minTime = Infinity;
		for (let target of robots.keys()) {
			if (target.time != undefined && target.time < minTime) {
				minTime = target.time;
			}
		}

		// // calculate middle position and way footprint
		let waymaximum;
		if (adjustWay) {
			waymaximum = Math.PI * (distanceToDefenseArea + robot_radius) * UtilDefense.cornerFactor + G.DefenseWidth + 2 * G.DefenseHeight;
		} else {
			waymaximum = Math.PI * (World.Geometry.DefenseRadius + distanceToDefenseArea + robot_radius) +
					World.Geometry.DefenseStretch;
		}
		let extraDistance = distanceToDefenseArea + robot_radius;
		let intersections = [];
		for (let [target, rlist] of robots.entries()) {
			let targetPos = target.pos;
			// centerBackPos will always return a way, as the target is limited to the field
			let [cBPos, way, sec] = UtilDefense.centerBackPos(targetPos, target.dir);
			// check if the target is necessary but reachable
			let idealBotPrel = <FriendlyRobot> UtilDefense.getClosestRobot(robotSet, cBPos)[0];

			let targetTime = target.time != undefined ? target.time : Infinity;
			// only consider the next timestamp
			// this is the reason there is only one "necessary" target
			if (targetTime > minTime) {
				targetTime = Infinity;
			}
			let endSpeed = Physics.robotMinEndspeed(idealBotPrel, cBPos, targetTime);
			let timeAroundDefenseArea = Robot.timeAroundDefenseAreaByWay(idealBotPrel, undefined, cBPos, way, extraDistance, true, endSpeed.length());
			if (adjustWay && sec != undefined) {
				way = UtilDefense.mulCornerFactor(way, sec, extraDistance);
			}
			let n = rlist.length;
			let biggerHyst = this._lastLocked ? 0.2 : 0;
			let smallerHyst = this._lastLocked ? 0.6 : 0.4;
			// this can only be true for the "necessary" target, because otherwise targetTime is Infinity
			if (targetTime + biggerHyst > timeAroundDefenseArea &&
					timeAroundDefenseArea + smallerHyst > targetTime || target.isShot) {
				// mark one intersection with one bot to be necessary, and continue with reduced n for the rest.
				intersections.push({
					waypos: way,
					wayrange: 2 * robot_radius + distanceBetweenDefenders,
					n: 1,
					targets: [{ target: target, way: way, n: 1 }],
					necessary: true,
					time: targetTime
				});
				n = n - 1;
				idealBot = idealBotPrel;
				necessaryWay = way;
				// continue as usual
			}
			let occupiedWay = (rlist.length) * (2 * robot_radius + distanceBetweenDefenders);

			way = MathUtil.bound(occupiedWay / 2, way, waymaximum - occupiedWay / 2);
			intersections.push({
				waypos: way,
				wayrange: occupiedWay,
				n: n,
				targets: [{ target: target, way: way, n: n }],
				necessary: false,
				time: targetTime
			});
		}
		this._lastLocked = idealBot != undefined;


		// merge overlapping way intervals
		let merged = true;
		while (merged) {
			merged = false;
			for (let ix = 0; ix < intersections.length; ix++) {
				let i = intersections[ix];
				let imin = i.waypos - i.wayrange / 2;
				let imax = i.waypos + i.wayrange / 2;
				for (let jx = 0; jx < intersections.length; jx++) {
					let j = intersections[jx];
					if (ix !== jx) {
						let jmin = j.waypos - j.wayrange / 2;
						let jmax = j.waypos + j.wayrange / 2;
						if (imax > jmin && jmax > imin) {
							if (i.necessary || j.necessary) {
								let necessary, unnecessary, unnecessaryX, necessaryMin, unnecessaryMin, necessaryMax, unnecessaryMax;
								if (j.necessary) {
									necessary = j, unnecessary = i;
									unnecessaryX = ix;
									necessaryMin = jmin, unnecessaryMin = imin;
									necessaryMax = jmax, unnecessaryMax = imax;
								} else {
									necessary = i, unnecessary = j;
									unnecessaryX = jx;
									necessaryMin = imin, unnecessaryMin = jmin;
									necessaryMax = imax, unnecessaryMax = jmax;
								}
								// handle necessary object n. Two necessary are not possible
								// first, move full robots to one side
								let disBetweenCenterOfCB = 2 * robot_radius + distanceBetweenDefenders;
								let fullRobotMax = Math.min(Math.max(Math.floor((unnecessaryMax - necessary.waypos) / disBetweenCenterOfCB), 0), unnecessary.n);
								let fullRobotMin = Math.min(Math.max(Math.floor((necessary.waypos - unnecessaryMin) / disBetweenCenterOfCB), 0), unnecessary.n);
								necessaryMax = necessaryMax + disBetweenCenterOfCB * fullRobotMax;
								necessaryMin = necessaryMin - disBetweenCenterOfCB * fullRobotMin;
								necessary.waypos = (necessaryMax + necessaryMin) / 2;
								necessary.wayrange = (necessaryMax - necessaryMin);
								necessary.n = necessary.n + fullRobotMax + fullRobotMin;
								// n.time shall not be modified
								if (i.targets[0] == undefined) {
									i.targets = j.targets;
								} else if (j.targets[0] == undefined) {
									j.targets = i.targets;
								}
								necessary.targets = i.targets.concat(j.targets);
								intersections.splice(unnecessaryX, 1);
								merged = true;
								break;
							} else {
								merged = true;
								let totalWay = i.wayrange + j.wayrange;
								let totalN = i.n + j.n;
								let totalPos = (i.waypos * i.n + j.waypos * j.n) / totalN;
								totalPos = Math.max(totalPos, totalWay / 2);
								totalPos = Math.min(totalPos, waymaximum - totalWay / 2);
								j.waypos = totalPos;
								j.wayrange = totalWay;
								j.n = totalN;
								if (i.targets[0] == undefined) {
									i.targets = j.targets;
								} else if (j.targets[0] == undefined) {
									j.targets = i.targets;
								}
								j.targets = i.targets.concat(j.targets);
								j.time = Math.min(i.time, j.time);
								intersections.splice(ix, 1);
								break;
							}
						}
					}
				}
				if (merged) {
					break;
				}
			}
		}

		// sort intersection interval table
		intersections.sort(lessthan_intersections);
		for (let i of intersections) {
			i.targets.sort(lessthan_targets);
		}
		const EPSILON = 0.005;
		let necessaryDefensePoint = undefined;

		// calculate final positions for important robots
		let delta = 2 * robot_radius + distanceBetweenDefenders;
		let defensePoints: Point[] = [];
		for (let i of intersections) {
			let nCounter = 0;
			let way = i.waypos - i.wayrange / 2 + delta / 2;
			for (let t of i.targets) {
				for (let _ = 0; _ < t.n; _++) {
					let realWay = way;
					if (adjustWay) {
						realWay = UtilDefense.divCornerFactor(way, extraDistance);
					}
					let final_pos = Field.defenseIntersectionByWay(realWay, extraDistance, true)!; // defenseIntersectionByWay can handle outOfBounds correctly (extended DefArea)
					vis.addCircle("g/centerback: Positions", final_pos, 0.1, vis.colors.skyBlue);
					vis.addPath("g/centerback: Positions", [final_pos, t.target.pos], vis.colors.skyBlue);
					vis.addCircle("g/centerback: Target", t.target.pos, 0.1, vis.colors.red);
					let point = {
						pos: final_pos,
						target: t.target,
						way: way,
						// we want the time for every non-important robot to be infinity, because t/d/centerback uses Physics.minEndSpeed to determine the end speed
						// this means they try to arrive at their target position with 0 end velocity, which avoids them crashing into the important centerback
						time: (i.n === 1) ? i.time : Infinity
					};
					if (necessaryWay != undefined && Math.abs(way - necessaryWay) < EPSILON) {
						if (necessaryDefensePoint != undefined) {
							throw new Error("two necessary Points are a problem");
						}
						necessaryDefensePoint = point;
					}
					if (nCounter < i.n) {
						defensePoints.push(point);
					}
					nCounter = nCounter + 1;
					way = way + delta;
				}
			}
		}

		// sort robots
		let sortedRobots: FriendlyRobot[] = [];
		for (let r of robotSet) {
			sortedRobots.push(r);
		}
		sortedRobots.sort(lessthan_robots);

		// store result (robot -> (pos, target, way))
		this._centerBackPositions = new Map<FriendlyRobot, Point>();
		if (idealBot == undefined) {
			if (defensePoints.length !== sortedRobots.length) {
				throw new Error();
			}
			for (let i = 0; i < sortedRobots.length; i++) {
				this._centerBackPositions[sortedRobots[i]] = defensePoints[i];
			}
		} else {
			// first: Assign the ideal bot to the necessary defense Point
			this._centerBackPositions[idealBot] = necessaryDefensePoint!;
			// second: partition the world in pre and post idealBot / defensePoint
			let indexRobot = sortedRobots.indexOf(idealBot);
			let firstRobots = sortedRobots.slice(0, indexRobot);
			let secondRobots = sortedRobots.slice(indexRobot + 1);
			let indexPoint = defensePoints.indexOf(necessaryDefensePoint!);
			let firstPoints = defensePoints.slice(0, indexPoint);
			let secondPoints = defensePoints.slice(indexPoint + 1);
			assignRobotsToPoints(firstRobots, firstPoints, this._centerBackPositions, necessaryDefensePoint!.way, true, delta, extraDistance);
			assignRobotsToPoints(secondRobots, secondPoints, this._centerBackPositions, necessaryDefensePoint!.way, false, delta, extraDistance);
		}

		// calculate final positions for unimportant robots
		this._privateCenterBackPositions = new Map<FriendlyRobot, Point>();
		for (let [robot, target] of unimportantApplications.entries()) {
			// if the target is the ball, predict it
			let targetPos = target.pos;
			let _, target_way, target_sec, robot_way, robot_sec;
			[_, target_way, target_sec] = UtilDefense.centerBackPos(targetPos);
			if (adjustWay != undefined && target_sec != undefined) {
				target_way = UtilDefense.mulCornerFactor(target_way, target_sec, extraDistance);
			}
			// stay on one end of a group of CenterBacks
			[_, robot_way, robot_sec] = UtilDefense.centerBackPos(robot.pos);
			if (adjustWay != undefined && robot_sec != undefined) {
				robot_way = UtilDefense.mulCornerFactor(robot_way, robot_sec, extraDistance);
			}
			for (let i of intersections) {
				if (target_way - robot_radius < i.waypos + i.wayrange / 2
						&& target_way + robot_radius > i.waypos - i.wayrange / 2) {
					target_way = MathUtil.bound(i.waypos - i.wayrange / 2 - robot_radius,
							robot_way, i.waypos + i.wayrange / 2 + robot_radius);
				}
			}
			if (adjustWay != undefined && robot_sec != undefined) {
				target_way = UtilDefense.divCornerFactor(target_way, extraDistance);
			}
			let pos = <Position> Field.defenseIntersectionByWay(target_way, extraDistance, true);
			vis.addCircle("g/centerback: Positions", pos, 0.1, vis.colors.greenHalf);
			this._privateCenterBackPositions[robot] = { pos: pos, target: target, way: target_way };
		}
	}

	public run(messaging: MessageBox, messages: Map<FriendlyRobot, Target>) {
		this.calculateCenterBackPositions(messages);

		for (let robot of messages.keys()) {
			let pos_target = this._centerBackPositions[robot];
			pos_target = pos_target || this._privateCenterBackPositions[robot];
			messaging.send(MessageType.centerBackPosTarget, robot, pos_target!);
		}
	}
}
