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
import * as Goal from "glados/observer/goal";
import * as Physics from "glados/observer/physics";
import * as ObserverRobot from "glados/observer/robot";
import { head } from "glados/util/collections";
import * as UtilDefense from "glados/util/defense";

let G = World.Geometry;

interface Ray {
	startPos: Position;
	startDirection: RelativePosition;
	pos: Position;
	way?: number;
	resetSpeed?: boolean;
	isDribbling?: boolean;
}

export class Defense {
	private ZONE_POS_LEFT: Position = new Vector(-G.FieldWidthQuarter, G.FieldHeightQuarter / 2);
	private ZONE_POS_RIGHT: Position = new Vector(G.FieldWidthQuarter, G.FieldHeightQuarter / 2);

	private _manmarkTargets: Map<Robot, number> = new Map(); 					// opponent -> rating
	private _manmarkAssignments: Map<Robot, FriendlyRobot> = new Map(); 		// opponent -> defender
	private _centerbackAssignments: FriendlyRobot[] = [];

	private _piggyTargets: Map<Robot, number> = new Map(); 						// opponent -> rating
	private _scrappedPiggyTargets: Robot[];
	private _piggyAssignments: Map<Robot, FriendlyRobot> = new Map();  			// opponent -> defender

	private _previousManmarkAssignments: Map<Robot, FriendlyRobot> = new Map(); // opponent -> defender
	private _previousPiggyAssignments: Map<Robot, FriendlyRobot> = new Map(); 	// opponent -> defender
	private _previousBallCenterbacks: FriendlyRobot[] = [];

	private _ballIsLeft: boolean = false;

	private _zoneDefenderPosLeft: Position;
	private _zoneDefenderPosRight: Position;

	private _centerbackIntersectionsRemoved = [false, false];

	private _messaging: MessageBox;

	constructor(messaging: MessageBox) {
		this._messaging = messaging;

		this._zoneDefenderPosLeft = UtilDefense.manMarkPos({
			pos: this.ZONE_POS_LEFT,
			radius: Constants.maxRobotRadius,
			speed: new Vector(0, 0)
		});
		this._zoneDefenderPosRight = UtilDefense.manMarkPos({
			pos: this.ZONE_POS_RIGHT,
			radius: Constants.maxRobotRadius,
			speed: new Vector(0, 0)
		});
		this._scrappedPiggyTargets = [];
		// TODO Zonenverteidigung porten
		// this._zonePosHysteresis = {}
	}

	private _updateManmarkTargets(): void {
		let dangerousness = UtilDefense.rateOpponentDangerousness();

		for (let [robot, rating] of dangerousness.entries()) {
			vis.addCircle("tr/defense: Dangerousness", robot.pos, 0.2, vis.fromTemperature(rating), true);
		}

		for (let robot of World.OpponentRobots) {
			// if we are already dueling the robot
			// the duel robot has to block the shot already
			// TODO shouldn't all defended opponents be checked? Did not change while porting but why wouldn't we?

			const defendedOpponentMessage = head(this._messaging.receive(MessageType.defendedOpponent));
			if (defendedOpponentMessage) {
				const [sender, opponent] = defendedOpponentMessage;
				if (opponent === robot && sender.pos.distanceToLineSegment(opponent.pos + Vector.fromAngle(opponent.dir) * (opponent.shootRadius + World.Ball.radius), G.FriendlyGoal) < sender.radius) {
					continue;
				}
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

	private _nextManmarkAssignment(defenders: FriendlyRobot[]): [Robot, FriendlyRobot] | undefined {
		if (defenders.length === 0) {
			return undefined;
		}

		let mostDangerousRobot: Robot | undefined = undefined;
		let highestDangerousness = -Infinity;
		for (let [robot, dangerousness] of this._manmarkTargets.entries()) {
			defenders
				.filter((defender) => defender === this._previousManmarkAssignments[robot])
				.forEach((_) => dangerousness += 0.2);
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

			return [mostDangerousRobot, <FriendlyRobot> bestDefender];
		}

		return undefined;
	}

	// _checkZoneDefender (zonePos) {
	// 	let rating = 0
	// 	for (robot, _ in pairs(this._manmarkAssignments)) {
	// 		let dist = zonePos.distanceTo(robot.pos)
	// 		rating = rating + Rating.valueToRating(dist, World.Geometry.FieldHeightHalf / 3, 0)
	// 	}
	// 	let decision = this._zonePosHysteresis[zonePos] ? rating < 0.6 : rating < 0.3 || not Referee.isStopState()
	// 	this._zonePosHysteresis[zonePos] = decision
	// 	return decision
	// }

	private _assignManmarkDefenders(defenders: FriendlyRobot[], nReservedDefenders: number) {
		while (defenders.length - nReservedDefenders > 0) {
			let assignment = this._nextManmarkAssignment(defenders);
			if (assignment == undefined) {
				break;
			}
			let [manmarkTarget, manmarker] = assignment;
			defenders.splice(defenders.indexOf(manmarker), 1);
			this._messaging.send(MessageType.roleAssignment, manmarker, { name: "ManMark", params: [manmarkTarget] });
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
			let target = findMostViableTarget(this._piggyTargets, defenders, this._previousPiggyAssignments);
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
			let value = direction.copy().setLength(1).y;
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
			// for dribbling robots, limit the first intersection to ones going into the goal
			let goallineIntersection = geom.intersectLineLine(pos, direction, G.FriendlyGoal, new Vector(1, 0))[0];
			if (isDribbling && goallineIntersection != undefined && Math.abs(goallineIntersection.x) > G.GoalWidth / 2) {
				let goalSide = new Vector(MathUtil.sign(goallineIntersection.x) * G.GoalWidth / 2, G.FriendlyGoal.y);
				this._createIntersections(result, pos, goalSide - pos, radius, index, false);
			} else {
				result.push({ startPos: pos, startDirection: direction, pos: intersections[0].pos, way: intersections[0].way});
			}
		}

		if (intersections[1] != undefined) {
			let toDefenseDist = pos.distanceTo(intersections[0].pos);
			let insidePos = pos + direction.copy().setLength(toDefenseDist + 0.03);
			result.push({ startPos: insidePos, startDirection: direction, pos: intersections[1].pos, way: intersections[1].way });
		}
	}

	private _assignBallCenterbacks(defenders: FriendlyRobot[]): void {
		const ROBOT_TIME_MARGIN_LOW = 0;
		const ROBOT_TIME_MARGIN_HIGH = 0.1;

		if (defenders.length === 0) {
			return;
		}

		let ballDistance = Field.distanceToFriendlyDefenseArea(World.Ball.pos, 0);
		let distanceToDefenseArea = UtilDefense.centerBackDistanceToDefenseArea();
		let defenseExtraRadius = distanceToDefenseArea + Constants.maxRobotRadius;
		let intersectionInfos: Ray[] = [];
		if (ballDistance < 1 ? World.Ball.speed.length() > 0.2 : !Ball.isSlowBall()) {
			this._createIntersections(intersectionInfos, World.Ball.pos, World.Ball.speed, defenseExtraRadius, 1, false);
		}
		let [predicedPos, predicedDir, isShot, _, isDribbling] = Goal.predictShot(true);
		if ((isShot || isDribbling) && (!predicedPos.equals(World.Ball.pos) || !predicedDir.equals(World.Ball.speed))) {
			let numBefore = intersectionInfos.length;
			this._createIntersections(intersectionInfos, predicedPos, predicedDir, defenseExtraRadius, 2, isDribbling);
			if (intersectionInfos.length > numBefore) {
				intersectionInfos[numBefore].resetSpeed = true;
				intersectionInfos[numBefore].isDribbling = isDribbling;
			}
		}

		// remove exit point of predictShot if enough points are available
		if (intersectionInfos[3] != undefined) {
			intersectionInfos.splice(3, 1);
		}

		// go over all intersections
		this._centerbackAssignments = [];
		let timeSum = 0;
		let currentBall: Physics.BallLike & { posZ: number, initSpeedZ: number, speedZ: number } = World.Ball;
		let didBallCB = false;
		for (let info of intersectionInfos) {
			let intersection = geom.intersectLineLine(World.Geometry.FriendlyGoal, new Vector(1, 0), info.startPos, info.startDirection);
			let intersectsGoal = intersection[0] != undefined && Math.abs(intersection[0].x) < World.Geometry.GoalWidth / 2 + 0.1;
			if (info.resetSpeed) {
				timeSum += Physics.ballTravelTime(currentBall, currentBall.pos.distanceTo(info.startPos));
				currentBall = {
					pos: info.startPos,
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
			let robotTime = ObserverRobot.timeAroundDefenseAreaByWay(closestRobot, undefined, <any> info.pos, info.way!, defenseExtraRadius, true, 3);
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
				this._messaging.send(
					MessageType.roleAssignment,
					closestAsFriendly,
					{ name: "CenterBack", params: { pos: info.startPos, dir: info.startDirection, time: rollTime }}
				);
				if (!amun.isPerformanceMode) {
					vis.addCircle("tr/defense: ball intersection", info.startPos, 0.08, vis.colors.yellow);
					vis.addCircle("tr/defense: ball intersection", info.pos, 0.12, vis.colors.red);
					vis.addPath("tr/defense: ball intersection", [ info.startPos, info.pos ], vis.colors.red);
				}
			}
		}

		// assign default centerbacks
		if (!didBallCB && defenders.length > 0) {
			// not in opponent corner attacks: assign a ball centerback
			let needDefaultDB = !Referee.isDefensiveCornerKick() && !Referee.isFriendlyFreeKickState();
			if (needDefaultDB) {
				let futureBallPosCB = UtilDefense.calculateBallPosition()[0];
				let defaultCB = UtilDefense.getClosestRobot(defenders, futureBallPosCB)[0];
				if (defaultCB != undefined) {
					defenders.splice(defenders.indexOf(defaultCB), 1);
					this._messaging.send(MessageType.roleAssignment, defaultCB, { name: "CenterBack", params: { pos: World.Ball.pos } });
				}
			}
		}
	}

	public _assignDefenders(): void {
		this._previousManmarkAssignments = new Map(this._manmarkAssignments);
		this._previousPiggyAssignments = new Map(this._piggyAssignments);
		this._previousBallCenterbacks = this._centerbackAssignments.slice();
		this._manmarkAssignments = new Map();

		if (Referee.isNonGameStage()) {
			return;
		}

		this._updateManmarkTargets();
		this._updatePiggyTargets();

		let defenders = [...this._messaging.receive(MessageType.defenderFlag).keys()];

		// if needDefaultCB then
		// 	local volleyDangerousness = UtilDefense.rateVolleyGoalShotThreats()
		// 	for let robot of World.OpponentRobots do
		// 		if volleyDangerousness[robot] and volleyDangerousness[robot] > 0.5 then
		// 			for _ = 1,2 do
		// 				local defaultCB = UtilDefense.getClosestRobot(defenders, UtilDefense.centerBackPos(World.Ball.pos))
		// 				if defaultCB then
		// 					table.removeValue(defenders, defaultCB)
		// 					this._send.roleAssignment(defaultCB,
		// 						{name = "CenterBack", params: { World.Ball }})
		// 				end
		// 			end
		// 			break
		// 		end
		// 	end
		// end

		this._assignBallCenterbacks(defenders);

		let nPiggies = determineNumberOfPiggies(defenders.length, this._manmarkTargets, this._piggyTargets);
		let nReservedDefenders = nPiggies;

		this._assignManmarkDefenders(defenders, nReservedDefenders);
		this._assignPiggies(defenders, nPiggies);
	}
}

function determineNumberOfPiggies(defenderCount: number, manmarkTargets: Map<Robot, number>, piggyTargets: Map<Robot, number>): number {
	debug.push("piggy count");
	debug.set("defender count", defenderCount);

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
		piggieCount = Math.max(0, defenderCount - nRelevantManMarkTargets);
	}

	if (piggieCount > 0) {
		let nRelevantPiggyTargets = 0;
		for (let viability of piggyTargets.values()) {
			if (viability > viabilityThreshold) {
				nRelevantPiggyTargets++;
			}
		}
		debug.set("relevantPiggyTargets", nRelevantPiggyTargets);
		piggieCount = Math.min(piggieCount, nRelevantPiggyTargets);
	}
	debug.pop();
	return piggieCount;
}

function findMostViableTarget(piggyTargets: Map<Robot, number>, defenders: FriendlyRobot[], previousAssignments: Map<Robot, FriendlyRobot>): Robot | undefined {
	let highestViability = -Infinity;
	let mostViableTarget: Robot | undefined = undefined;
	for (let [target, viability] of piggyTargets.entries()) {
		// hysteresis
		if (previousAssignments.has(target)) {
			defenders
				.filter((def) => previousAssignments[target] === def)
				.forEach((_) => viability += 0.3);
		}
		if (viability > highestViability) {
			highestViability = viability;
			mostViableTarget = target;
		}
	}

	return mostViableTarget;
}
