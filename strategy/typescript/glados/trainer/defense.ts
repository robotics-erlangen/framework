import * as Constants from "base/constants";
import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import * as Referee from "base/referee";
import { FriendlyRobot, Robot } from "base/robot";
import { Position, RelativePosition, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { MessageBox, MessageType } from "glados/control/messaging";
import * as Ball from "glados/observer/ball";
import * as Crash from "glados/observer/crash";
import * as Goal from "glados/observer/goal";
import * as Physics from "glados/observer/physics";
import * as ObserverRobot from "glados/observer/robot";
import * as UtilDefense from "glados/util/defense";
import * as Rating from "glados/util/rating";

const G = World.Geometry;

interface Ray {
	startPos: Position;
	startDirection: RelativePosition;
	pos: Position;
	way?: number;
	resetSpeed?: boolean;
	isDribbling?: boolean;
	isShot?: boolean;
}

export class Defense {
	private _manmarkTargets: Map<Robot, number> = new Map(); 					// opponent -> rating
	private _manmarkAssignments: Map<Robot, FriendlyRobot> = new Map(); 		// opponent -> defender
	private _centerbackAssignments: FriendlyRobot[] = [];

	private _piggyTargets: Map<Robot, number> = new Map(); 						// opponent -> rating
	private _scrappedPiggyTargets: Robot[];
	private _piggyAssignments: Map<Robot, FriendlyRobot> = new Map(); // opponent -> defender

	private _previousManmarkAssignments: Map<Robot, FriendlyRobot> = new Map(); // opponent -> defender
	private _previousPiggyAssignments: Map<Robot, FriendlyRobot> = new Map(); 	// opponent -> defender

	private _centerbackIntersectionsRemoved = [false, false];

	private _messaging: MessageBox;

	public constructor(messaging: MessageBox) {
		this._messaging = messaging;

		this._scrappedPiggyTargets = [];
	}

	private _updateManmarkTargets(): void {
		let dangerousness = UtilDefense.rateOpponentDangerousness();

		for (let [robot, rating] of dangerousness.entries()) {
			vis.addCircle("tr/defense: Dangerousness", robot.pos, 0.2, vis.fromTemperature(rating), true);
		}

		const defendedOpponentMessages = Array.from(this._messaging.receive(MessageType.defendedOpponent).entries());
		for (let robot of World.OpponentRobots) {
			// if we are already dueling the robot
			// the duel robot has to block the shot already
			const robotIsDuelled = defendedOpponentMessages
				.filter(([_sender, opponent]) => opponent === robot)
				.some(([sender, opponent]) => {
					const oppDribblerPos = opponent.pos + Vector.fromPolar(opponent.dir, opponent.shootRadius + World.Ball.radius);
					return sender.pos.distanceToLineSegment(oppDribblerPos, G.FriendlyGoal) < sender.radius;
				});
			if (robotIsDuelled) {
				continue;
			}

			let alreadyTargeted = this._previousManmarkAssignments.has(robot);
			// if the robot is the (not aggressive) opponent keeper
			let extraDist = alreadyTargeted ? 0.2 : 0.4;
			if (robot === World.OpponentKeeper && Field.isInOpponentDefenseArea(robot.pos, extraDist)) {
				continue;
			}

			// if in STOP, don't mark opponents who are close to the stop circle
			let stopCircleMarkRadius = alreadyTargeted ? 0.7 : 0.85;
			if (Referee.isStopState() && robot.pos.distanceTo(World.Ball.pos) < stopCircleMarkRadius) {
				continue;
			}

			/*
			 * otherwise, target the opponent.
			 * rate as not dangerous if UtilDefense did note give a value
			 */
			let targetRating = dangerousness.get(robot) || 0;
			if (alreadyTargeted) {
				targetRating += 0.1;
			}
			this._manmarkTargets.set(robot, targetRating);
		}
	}

	private lastManmarkOrder: Map<number, Robot> = new Map();
	private nextManmarkAssignment(defenders: FriendlyRobot[], counter: number): [Robot, FriendlyRobot] | undefined {
		if (defenders.length === 0) {
			return undefined;
		}

		let mostDangerousRobot: Robot | undefined = undefined;
		let highestDangerousness = -Infinity;
		for (let [robot, dangerousness] of this._manmarkTargets.entries()) {
			defenders
				.filter((defender) => defender === this._previousManmarkAssignments[robot])
				.forEach((_) => dangerousness += 0.2);
			if (this.lastManmarkOrder[counter] === robot) {
				dangerousness += 0.1;
			}
			if (dangerousness > highestDangerousness) {
				highestDangerousness = dangerousness;
				mostDangerousRobot = robot;
			}
		}

		if (mostDangerousRobot != undefined && highestDangerousness > 0) {
			let targetBot = mostDangerousRobot;
			let bestDefender = targetBot;
			let intersectionDefenseArea = Field.intersectRayDefenseArea(
				targetBot.pos,
				G.FriendlyGoal - targetBot.pos,
				0.2,
				true
			)[0];
			let manMarkPos = UtilDefense.manMarkPos(mostDangerousRobot);
			if (intersectionDefenseArea != undefined) {
				// manmark should quickly move into the goalline
				// whichever robot is close to the goalline and close to the defense area is preferred
				let bestDistance = Infinity;
				defenders.forEach((bot) => {
					let posOnGoalLine = bot.pos.nearestPosOnLine(intersectionDefenseArea!, targetBot.pos);
					let distanceToGoalLine = posOnGoalLine.distanceTo(bot.pos);

					// a figurative distance, the distance to the goalline is weighted more than the distance to the manMarkPos
					// this is because a manMark will first try to intercept the goal line
					let totalDistance = distanceToGoalLine * 1.5 + posOnGoalLine.distanceTo(manMarkPos);
					if (this._previousManmarkAssignments[targetBot] === bot) {
						totalDistance *= 0.75;
					}

					if (this._previousPiggyAssignments[<Robot> mostDangerousRobot] === bot) {
						totalDistance *= 1.2;
					}

					if (totalDistance < bestDistance) {
						bestDistance = totalDistance;
						bestDefender = bot;
					}

				});
			} else {
				bestDefender = <FriendlyRobot> UtilDefense.getClosestRobot(defenders, manMarkPos)[0];
			}
			this._manmarkAssignments[mostDangerousRobot] = <FriendlyRobot> bestDefender;
			this._manmarkTargets.delete(mostDangerousRobot);

			this.lastManmarkOrder[counter] = mostDangerousRobot;

			return [mostDangerousRobot, <FriendlyRobot> bestDefender];
		}

		return undefined;
	}

	private _assignManmarkDefenders(defenders: FriendlyRobot[], nReservedDefenders: number) {
		let counter = 0;
		while (defenders.length - nReservedDefenders > 0) {
			let assignment = this.nextManmarkAssignment(defenders, counter);
			if (assignment == undefined) {
				break;
			}
			let [manmarkTarget, manmarker] = assignment;
			defenders.splice(defenders.indexOf(manmarker), 1);
			this._messaging.send(MessageType.roleAssignment, manmarker, { name: "ManMark", params: [manmarkTarget] });
			counter++;
		}
	}

	private _updatePiggyTargets(): void {
		let passViability = UtilDefense.rateOpponentPassViability(); // opponent -> rating
		for (let [robot, rating] of passViability.entries()) {
			vis.addCircle("tr/defense: passViability", robot.pos, 0.2, vis.fromTemperature(rating), true);
		}

		for (let [opp, rating] of passViability.entries()) {
			if (this._previousPiggyAssignments.has(opp)) {
				rating += 0.1;
				passViability[opp] = rating;
			}
		}

		let scrappedTargets: Robot[] = [];

		// remove targets with lowest ratings
		for (let [opp, rating] of passViability.entries()) {
			let ratingThreshold = this._scrappedPiggyTargets.includes(opp) ? 0.15 : 0.1;
			if (rating < ratingThreshold) {
				passViability.delete(opp);
				scrappedTargets.push(opp);
			}
		}

		this._scrappedPiggyTargets = scrappedTargets;
		this._piggyTargets = passViability;
	}

	private _assignPiggies(defenders: FriendlyRobot[], nPiggies: number): void {
		// assign piggies
		while (defenders.length > 0 && nPiggies > 0) {
			let target = findMostViableTarget(this._piggyTargets, defenders, this._previousPiggyAssignments)[0];
			if (target == undefined) {
				break;
			}
			this._piggyTargets.delete(target);

			let piggyPos = UtilDefense.piggyPos(target);
			let piggy = UtilDefense.getClosestRobot(defenders, piggyPos)[0];

			if (piggy == undefined || target == undefined) {
				break;
			}

			this._piggyAssignments[target] = <FriendlyRobot> piggy;
			defenders.splice(defenders.indexOf(<FriendlyRobot> piggy), 1);
			this._messaging.send(MessageType.roleAssignment, piggy, { name: "Piggy", params: [target] });
			nPiggies--;
		}
	}

	private _createIntersections(result: Ray[], pos: Position, direction: RelativePosition, radius: number, index: number, isDribbling: boolean): void {
		let lastRemoved = this._centerbackIntersectionsRemoved[index];
		this._centerbackIntersectionsRemoved[index] = false;
		const MAX_DEFENSE_DIST = 5;
		let intersections = Field.intersectionsRayDefenseArea(pos, direction, radius, true);
		if (intersections[0] != undefined && intersections[1] != undefined) {
			if (intersections[0].pos.distanceToSq(pos) > intersections[1].pos.distanceToSq(pos)) {
				let temp = intersections[0];
				intersections[0] = intersections[1];
				intersections[1] = temp;
			}
			let maxDistance = lastRemoved ? 0.3 : 0.2;
			let value = direction.normalized().y;
			let minFlatness = lastRemoved ? 0.3 : 0.2;
			if (intersections[0].pos.distanceToSq(intersections[1].pos) < maxDistance ** 2 || value < minFlatness && intersections[1].sec === 3) {
				intersections.splice(1, 1);
				this._centerbackIntersectionsRemoved[index] = true;
			}
		}

		if (intersections[0] != undefined) {
			if (intersections[0].pos.distanceToSq(pos) > MAX_DEFENSE_DIST ** 2) {
				return;
			}
			// for dribbling robots, limit the intersections to ones going into the goal
			let goallineIntersection = geom.intersectLineLine(pos, direction, G.FriendlyGoal, new Vector(1, 0))[0];
			if (isDribbling && goallineIntersection != undefined && Math.abs(goallineIntersection.x) > G.GoalWidth / 2
					&& Math.abs(goallineIntersection.x) < G.FieldWidthHalf * 1.5) {
				let goalSide = new Vector(MathUtil.sign(goallineIntersection.x) * G.GoalWidth / 2, G.FriendlyGoal.y);
				this._createIntersections(result, pos, goalSide - pos, radius, index, false);
				return;
			} else {
				result.push({ startPos: pos, startDirection: direction, pos: intersections[0].pos, way: intersections[0].way });
			}
		}

		if (intersections[1] != undefined) {
			let toDefenseDist = pos.distanceTo(intersections[0].pos);
			let insidePos = pos + direction.withLength(toDefenseDist + 0.03);
			result.push({ startPos: insidePos, startDirection: direction, pos: intersections[1].pos, way: intersections[1].way });
		}
	}

	private lastDefaultCB: FriendlyRobot | undefined;
	// assigns centerbacks for the current trajectory of the ball and predictShot if they intersect with the defense area
	// both the trajectory of the ball and predictShot can intersect the defense area twice, but if both intersect twice
	// we ignore the exit intersection of predictShot
	// if we could not assign at least one centerback to one of these intersections we assign a default centerback for the
	// current position of the ball without a specific direction
	private _assignBallCenterbacks(defenders: FriendlyRobot[]): void {
		const ROBOT_TIME_MARGIN_LOW = 0;
		const ROBOT_TIME_MARGIN_HIGH = 0.1;

		if (defenders.length === 0) {
			return;
		}

		let ballDistance = Field.distanceToFriendlyDefenseArea(World.Ball.pos, 0);
		let distanceToDefenseArea = UtilDefense.centerBackDistanceToDefenseArea();
		let defenseExtraRadius = distanceToDefenseArea + Constants.maxRobotRadius;

		// check if an opponent robot receives the pass and won't move out of the way
		const opponentWillStopBall = World.OpponentRobots.filter((robot) => Ball.receivesPass(robot) && Crash.getStationary(robot))
			.some((robot) => {
				const vecBallToRobot = robot.pos - World.Ball.pos;
				const tBallToRobot = Physics.ballTravelTime(World.Ball, vecBallToRobot.length());
				// assume the fastest way for the robot to avoid the ball is moving perpendicular to vecBallToRobot
				// considering Crash.getStationary has to be true for the robot this assumption should be reasonable
				const ballAvoidingDirection = new Vector(vecBallToRobot.y, -vecBallToRobot.x).normalized();
				const maxRobotVelocity = robot.maxSpeed * ballAvoidingDirection;
				const tOppOutOfWay0 = Physics.robotTimeToPos(robot, robot.pos + robot.radius * ballAvoidingDirection, maxRobotVelocity)[0];
				const tOppOutOfWay1 = Physics.robotTimeToPos(robot, robot.pos - robot.radius * ballAvoidingDirection, -maxRobotVelocity)[0];
				// basically use the minimum of avoiding the robot to the "left" or to the "right"
				const tOppOutOfWay = Math.min(tOppOutOfWay0, tOppOutOfWay1);
				return tBallToRobot < tOppOutOfWay;
			});

		// compute all the interesting intersections of the current trajectory of the ball and predictShot with the defense area
		let intersectionInfos: Ray[] = [];
		// add intersections of current trajectory of the ball if the balls speed is dangerous and it is not stopped
		if (!opponentWillStopBall && (ballDistance < 1 ? World.Ball.speed.length() > 0.2 : !Ball.isSlowBall())) {
			this._createIntersections(intersectionInfos, World.Ball.pos, World.Ball.speed, defenseExtraRadius, 0, false);
		}

		// add intersections of predictShot with the defense area if we actually predict the ball to be shot
		let [predicedPos, predicedDir, isShot, _, isDribbling] = Goal.predictShot(true);
		if ((isShot || isDribbling) && (!predicedPos.equals(World.Ball.pos) || !predicedDir.equals(World.Ball.speed))) {
			let numBefore = intersectionInfos.length;
			this._createIntersections(intersectionInfos, predicedPos, predicedDir, defenseExtraRadius, 1, isDribbling);
			if (intersectionInfos.length > numBefore) {
				intersectionInfos[numBefore].resetSpeed = true;
				intersectionInfos[numBefore].isDribbling = isDribbling;
				intersectionInfos[numBefore].isShot = isShot;
			}
		}

		// remove exit point of predictShot if enough points are available
		if (intersectionInfos[3] != undefined) {
			intersectionInfos.splice(3, 1);
		}

		// go over all intersections
		this._centerbackAssignments = [];
		let timeSum = 0;
		let currentBall: Physics.BallLike & { posZ: number; initSpeedZ: number; speedZ: number } = World.Ball;
		let didBallCB = false;
		for (let info of intersectionInfos) {
			let intersection = geom.intersectLineLine(World.Geometry.FriendlyGoal, new Vector(1, 0), info.startPos, info.startDirection);
			let intersectsGoal = intersection[0] != undefined && Math.abs(intersection[0].x) < World.Geometry.GoalWidth / 2 + 0.1;
			if (info.resetSpeed) {
				timeSum += Physics.ballTravelTime(currentBall, currentBall.pos.distanceTo(info.startPos));
				currentBall = {
					pos: info.startPos,
					// ballTravelTime only cares about the absolute value of the velocity, so the direction of the speed does not matter here
					speed: new Vector(Constants.maxBallSpeed, 0), maxSpeed: Constants.maxBallSpeed,
					posZ: 0, initSpeedZ: 0, speedZ: currentBall.speedZ
				};
			}
			let rollTime = timeSum + Physics.ballTravelTime(currentBall, currentBall.pos.distanceTo(info.pos));
			if (info.isDribbling) {
				rollTime += 0.4;
			}
			if (rollTime === Infinity) {
				// other intersections could reach the defense area,
				// since the ball could currently be dribbled
				continue;
			}
			let closestRobot = UtilDefense.getClosestRobot(defenders, info.pos)[0];
			if (closestRobot == undefined) {
				break;
			}
			let toGoalLineDistance = intersection[0] ? info.pos.distanceTo(intersection[0]) : 10;
			let robotTime = ObserverRobot.timeAroundDefenseAreaByWay(closestRobot, undefined, info.pos, info.way!, defenseExtraRadius, true, 3);
			let robotTimeMargin = this._centerbackAssignments.indexOf(closestRobot) >= 0 ? ROBOT_TIME_MARGIN_LOW : ROBOT_TIME_MARGIN_HIGH;
			if ((robotTime + robotTimeMargin < rollTime
					|| robotTime < rollTime && rollTime < ROBOT_TIME_MARGIN_HIGH
					|| this._centerbackAssignments.length === 0 && intersectsGoal
					|| rollTime < 0.25 && robotTime < 0.4)
					&& (toGoalLineDistance >= 0.25 || intersectsGoal)) {
				let closestAsFriendly = <FriendlyRobot> closestRobot;
				this._centerbackAssignments.push(closestAsFriendly);
				defenders.splice(defenders.indexOf(closestAsFriendly), 1);
				didBallCB = true;
				this.lastDefaultCB = closestAsFriendly;
				this._messaging.send(
					MessageType.roleAssignment,
					closestAsFriendly,
					{ name: "CenterBack", params: { pos: info.startPos, dir: info.startDirection, time: rollTime, isShot: isShot } }
				);
				if (!amun.isPerformanceMode) {
					vis.addCircle("tr/defense: ball intersection", info.startPos, 0.08, vis.colors.yellow);
					vis.addCircle("tr/defense: ball intersection", info.pos, 0.12, vis.colors.red);
					vis.addPath("tr/defense: ball intersection", [info.startPos, info.pos], vis.colors.red);
				}
			}
		}

		// assign default centerbacks
		if (!didBallCB && defenders.length > 0) {
			// not in opponent corner attacks: assign a ball centerback
			let needDefaultDB = !Referee.isDefensiveCornerKick() && !Referee.isFriendlyFreeKickState();
			if (needDefaultDB) {
				let futureBallPosCB = UtilDefense.calculateBallPosition()[0];
				const hysteresisDistance = (r: FriendlyRobot, pos: Position) => {
					const ballDist = World.Ball.pos.distanceTo(pos);
					const hysteresisSize = 0.6 * Rating.valueToRating(ballDist, 2, 5);
					const hysteresis = r === this.lastDefaultCB ? -hysteresisSize : 0;
					return r.pos.distanceTo(pos) + hysteresis;
				};
				const defaultCB = UtilDefense.getClosestRobot(defenders, futureBallPosCB, hysteresisDistance)[0];
				if (defaultCB != undefined) {
					defenders.splice(defenders.indexOf(defaultCB), 1);
					this.lastDefaultCB = defaultCB;
					didBallCB = true;
					this._messaging.send(MessageType.roleAssignment, defaultCB, { name: "CenterBack", params: { pos: World.Ball.pos } });
				}
			}
		}

		if (!didBallCB) {
			this.lastDefaultCB = undefined;
		}
	}

	public _assignDefenders(): void {
		this._previousManmarkAssignments = new Map(this._manmarkAssignments);
		this._previousPiggyAssignments = new Map(this._piggyAssignments);
		this._manmarkAssignments = new Map();
		this._piggyAssignments = new Map();

		if (Referee.isNonGameStage()) {
			return;
		}

		this._updateManmarkTargets();
		this._updatePiggyTargets();

		let defenders = [...this._messaging.receive(MessageType.defenderFlag).keys()];

		this._assignBallCenterbacks(defenders);

		let nPiggies = determineNumberOfPiggies(defenders, this._manmarkTargets, this._piggyTargets, this._previousPiggyAssignments);
		let nReservedDefenders = nPiggies;

		this._assignManmarkDefenders(defenders, nReservedDefenders);
		this._assignPiggies(defenders, nPiggies);
	}
}

export interface CenterBackRoleAssignment {
	name: "CenterBack";
	params: { pos: Position; dir?: RelativePosition; time?: number; isShot?: boolean };
}

export interface ManMarkRoleAssignment {
	name: "ManMark";
	params: Robot[];
}

export interface PiggyRoleAssignment {
	name: "Piggy";
	params: Robot[];
}

export interface ZoneDefenseRoleAssignment {
	name: "ZoneDefense";
	params: Position[];
}

export type RoleAssignment = CenterBackRoleAssignment | ManMarkRoleAssignment | PiggyRoleAssignment | ZoneDefenseRoleAssignment;

function determineNumberOfPiggies(defenders: FriendlyRobot[], manmarkTargets: Map<Robot, number>,
		piggyTargets: Map<Robot, number>, previousPiggyAssignments: Map<Robot, FriendlyRobot>): number {
	debug.push("piggy count");
	debug.set("defender count", defenders.length);

	if (Referee.isKickoffState()) {
		debug.pop();
		return 0;
	}

	let dangerousnessThreshold: number;
	let viabilityThreshold: number;

	/*
	 * Prioritize manmarks over piggies when in own field half.
	 * Rating hysteresis is applied during target updating
	 */
	if (World.Ball.pos.y < 0) {
		dangerousnessThreshold = 0.3;
		viabilityThreshold = 0.8;
	} else {
		dangerousnessThreshold = 0.8;
		viabilityThreshold = 0.3;
	}

	let piggieCount = 0;
	if (!Ball.ballHeadingForGoal(World.Ball, true)
			|| World.Ball.speed.length() < 3 || (World.Ball.pos + World.Ball.speed).y > -1) {
		let nRelevantManMarkTargets = 0;
		for (let dangerousness of manmarkTargets.values()) {
			if (dangerousness > dangerousnessThreshold) {
				nRelevantManMarkTargets++;
			}
		}
		debug.set("relevantManMarkTargets", nRelevantManMarkTargets);
		piggieCount = Math.max(0, defenders.length - nRelevantManMarkTargets);
	}

	if (piggieCount > 0) {
		let nRelevantPiggyTargets = 0;
		let targetCopy = new Map(piggyTargets);
		while (targetCopy.size > 0) {
			let [target, viability] = findMostViableTarget(targetCopy, defenders, previousPiggyAssignments);
			if (target == undefined || viability < viabilityThreshold) {
				break;
			}
			nRelevantPiggyTargets++;
			targetCopy.delete(target);
		}
		debug.set("relevantPiggyTargets", nRelevantPiggyTargets);
		piggieCount = Math.min(piggieCount, nRelevantPiggyTargets);
	}
	debug.pop();
	return piggieCount;
}

function findMostViableTarget(piggyTargets: Map<Robot, number>, defenders: FriendlyRobot[], previousAssignments: Map<Robot, FriendlyRobot>): [Robot | undefined, number] {
	let highestViability = -Infinity;
	let mostViableTarget: Robot | undefined = undefined;
	for (let [target, viability] of piggyTargets.entries()) {
		// hysteresis
		if (previousAssignments.has(target)) {
			defenders
				.filter((def) => previousAssignments[target] === def)
				.forEach((_) => viability += 0.1);
		}
		if (viability > highestViability) {
			highestViability = viability;
			mostViableTarget = target;
		}
	}

	return [mostViableTarget, highestViability];
}
