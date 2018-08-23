import * as Constants from "base/constants";
import * as debug from "base/debug";
import * as Field from "base/field";
import * as MathUtil from "base/mathutil";
import * as geom from "base/geom";
import {Robot, FriendlyRobot} from "base/robot";
import * as Referee from "base/referee";
import {Vector, Position} from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import * as Ball from "glados/observer/ball";
import * as Goal from "glados/observer/goal";
import * as ObserverRobot from "glados/observer/robot";
import * as Physics from "glados/observer/physics";
import * as UtilDefense from "glados/util/defense";
import * as Rating from "glados/util/rating";

let G = World.Geometry;

class Defense {
	_manmarkTargets: Map<Robot, number>(); // opponent -> rating
	_manmarkAssignments: Map<Robot, FriendlyRobot>(); // opponent -> defender
	_centerbackAssignments: Map<Robot, FriendlyRobot>();

	_piggyTargets: Map<Robot, number>(); // opponent -> rating
	_piggyAssignments: Map<Robot, FriendlyRobot>();  // opponent -> defender

	_previousManmarkAssignments: Map<Robot, FriendlyRobot>(); // opponent -> defender
	_previousPiggyAssignments: Map<Robot, FriendlyRobot>(); // opponent -> defender
	_previousBallCenterbacks: FriendlyRobot[];

	_ballIsLeft: boolean = false;

	constructor () {

		let zonePosLeft = new Vector(-World.Geometry.FieldWidthHalf/2, -World.Geometry.FieldHeightHalf/4)
		let zonePosRight = new Vector(World.Geometry.FieldWidthHalf/2, -World.Geometry.FieldHeightHalf/4)
		this._zonePosLeft = zonePosLeft
		this._zonePosRight = zonePosRight
		this._zoneDefenderPosLeft = UtilDefense.manMarkPos(
			{pos: zonePosLeft, radius: Constants.maxRobotRadius, speed: new Vector(0, 0)})
		this._zoneDefenderPosRight = UtilDefense.manMarkPos(
			{pos: zonePosRight, radius: Constants.maxRobotRadius, speed: new Vector(0, 0)})
		this._zonePosHysteresis = {}
		this._centerbackIntersectionsRemoved = [false, false]
	}

	_updateManmarkTargets () {
		let dangerousness = UtilDefense.rateOpponentDangerousness()

		for (robot, rating in pairs(dangerousness)) {
			vis.addCircle("tr/defense: Dangerousness", robot.pos, 0.2, vis.fromTemperature(rating), true)
		}

		for (let robot of World.OpponentRobots) {
			let alreadyTargeted = this._previousManmarkAssignments[robot] != nil

			// if we are already dueling the robot
			// the duel robot has to block the shot already
			let sender, msg = next(this._inbox.defendedOpponent())
			if (msg == robot && sender.pos.distanceToLineSegment(msg.pos + Vector.fromAngle(msg.dir) * (msg.shootRadius + World.Ball.radius), World.Geometry.FriendlyGoal) < sender.radius) {
				continue;
			}

			// if the robot is the (not aggressive) opponent keeper
			let extraDist = alreadyTargeted ? 0.2 : 0.4
			if (robot == World.OpponentKeeper && Field.isInOpponentDefenseArea(robot.pos, extraDist)) {
				continue;
			}

			// if in STOP, don't mark opponents who are close to the stop circle
			let stopCircleMarkRadius = alreadyTargeted ? 0.7 : 0.85
			if (Referee.isStopState() && robot.pos.distanceTo(World.Ball.pos) < stopCircleMarkRadius) {
				continue;
			}

			// otherwise, target the opponent
			this._manmarkTargets[robot] = dangerousness[robot]
		}
	}

	_nextManmarkAssignment (defenders: FriendlyRobot[]) {
		if (defenders.length == 0) {
			return;
		}

		let mostDangerousRobot = undefined;
		let highestDangerousness = -Infinity;
		for (let [robot, dangerousness] of this._manmarkTargets.entries()) {
			for (let defender of defenders) {
				if (this._previousManmarkAssignments.get(robot) === defender) {
					dangerousness = dangerousness + 0.2;
				}
			}
			if (dangerousness > highestDangerousness) {
				highestDangerousness = dangerousness;
				mostDangerousRobot = robot;
			}
		}

		if (mostDangerousRobot != undefined && highestDangerousness > 0) {
			let targetBot = mostDangerousRobot;
			let bestDefender = targetBot;

			let intersectionDefenseArea = Field.intersectRayDefenseArea(targetBot.pos, G.FriendlyGoal - targetBot.pos, 0.2, true);
			let manMarkPos = UtilDefense.manMarkPos(mostDangerousRobot);
			if (intersectionDefenseArea) {
				// manmark should quickly move into the goalline
				// whichever robot is close to the goalline and close to the defense area is preferred
				let bestDistance = Infinity;
				for (let bot of defenders) {
					let posOnGoalLine, distanceToGoalLine = bot.pos.orthogonalProjection(intersectionDefenseArea, targetBot.pos);
					distanceToGoalLine = Math.abs(distanceToGoalLine);

					if (Field.isInDefenseArea(posOnGoalLine, 0.05, true)) {
						posOnGoalLine = Field.intersectRayDefenseArea(posOnGoalLine, targetBot.pos-posOnGoalLine, 0.2, true) || posOnGoalLine
					}

					// a figurative distance, the distance to the goalline is weighted more than the distance to the manMarkPos
					// this is because a manMark will first try to intercept the goal line
					let totalDistance = distanceToGoalLine * 1.5 + posOnGoalLine.distanceTo(manMarkPos)
					if (this._previousManmarkAssignments[targetBot] == bot) {
						totalDistance = 0.75 * totalDistance
					}

					if (this._previousPiggyAssignments[mostDangerousRobot] == bot) {
						totalDistance = totalDistance * 1.2
					}

					if (totalDistance < bestDistance) {
						bestDistance = totalDistance
						bestDefender = bot
					}
				}
			} else {
				bestDefender = UtilDefense.getClosestRobot(defenders, manMarkPos)
			}


			this._manmarkAssignments[mostDangerousRobot] = bestDefender
			this._manmarkTargets[mostDangerousRobot] = nil

			return mostDangerousRobot, bestDefender
		}
	}


	_checkZoneDefender (zonePos) {
		let rating = 0
		for (robot, _ in pairs(this._manmarkAssignments)) {
			let dist = zonePos.distanceTo(robot.pos)
			rating = rating + Rating.valueToRating(dist, World.Geometry.FieldHeightHalf / 3, 0)
		}
		let decision = this._zonePosHysteresis[zonePos] ? rating < 0.6 : rating < 0.3 || not Referee.isStopState()
		this._zonePosHysteresis[zonePos] = decision
		return decision
	}

	_assignManmarkDefenders (defenders, nReservedDefenders) {
		while (#defenders - nReservedDefenders > 0) {
			let manmarkTarget, manmarker = this._nextManmarkAssignment(defenders)
			if (not manmarkTarget || not manmarker) {
				break
			}

			table.removeValue(defenders, manmarker)
			this._send.roleAssignment(manmarker,
				{name = "ManMark", params: { manmarkTarget }})
		}
	}

	_updatePiggyTargets () {
		let passViability = UtilDefense.rateOpponentPassViability() // opponent -> rating
		for (robot, rating in pairs(passViability)) {
			vis.addCircle("tr/defense: passViability", robot.pos, 0.2, vis.fromTemperature(rating), true)
		}

		// remove targets with lowest rating
		for (opp, rating in pairs(passViability)) {
			if (rating < 0.1) {
				passViability[opp] = nil
			}
		}

		this._piggyTargets = passViability
	}

	function Defense:_assignPiggies (defenders, nPiggies) {
		// assign piggies
		while (#defenders > 0 && nPiggies > 0) {

			let target = findMostViableTarget(this._piggyTargets, defenders, this._previousPiggyAssignments)
			if (not target) {
				break
			}

			this._piggyTargets[target] = nil

			let piggyPos = UtilDefense.piggyPos(target)
			let piggy = UtilDefense.getClosestRobot(defenders, piggyPos)

			if (not piggy || not target) {
				break
			}

			this._piggyAssignments[target] = piggy
			table.removeValue(defenders, piggy)
			this._send.roleAssignment(piggy,
				{name = "Piggy", params: { target }})
			nPiggies = nPiggies - 1
		}
	}

	// inserts tables of: way, pos, startPos, startDirection of the ray into result
	_createIntersections (result, pos, direction, radius, index, isDribbling) {
		let lastRemoved = this._centerbackIntersectionsRemoved[index]
		this._centerbackIntersectionsRemoved[index] = false
		let MAX_DEFENSE_DIST = 5
		let intersections = Field.intersectionsRayDefenseArea(pos, direction, radius, true)
		if (intersections[1] && intersections[2]) {
			if (intersections[1].pos.distanceToSq(pos) > intersections[2].pos.distanceToSq(pos)) {
				intersections[1], intersections[2] = intersections[2], intersections[1]
			}
			let maxDistance = lastRemoved ? 0.3 : 0.2
			let value = direction.copy().setLength(1).y
			let minFlatness = lastRemoved ? 0.3 : 0.2
			if (intersections[1].pos.distanceToSq(intersections[2].pos) < maxDistance * maxDistance  ||
					value < minFlatness && intersections[2].sec == 3) {
				intersections[2] = nil
				this._centerbackIntersectionsRemoved[index] = true
			}
		}
		if (intersections[1]) {
			if (intersections[1].pos.distanceToSq(pos) > MAX_DEFENSE_DIST * MAX_DEFENSE_DIST) {
				return
			}
			// for dribbling robots, limit the first intersection to ones going into the goal
			let goallineIntersection = geom.intersectLineLine(pos, direction, G.FriendlyGoal, new Vector(1, 0))
			if (isDribbling && goallineIntersection && Math.abs(goallineIntersection.x) > G.GoalWidth / 2) {
				let goalSide = new Vector(MathUtil.sign(goallineIntersection.x) * G.GoalWidth / 2, G.FriendlyGoal.y)
				this._createIntersections(result, pos, goalSide - pos, radius, index, false)
			} else {
				table.insert(result, {startPos: pos, startDirection: direction,
					pos: intersections[1].pos, way: intersections[1].way})
			}
		}
		if (intersections[2]) {
			let toDefenseDist = pos.distanceTo(intersections[1].pos)
			let insidePos = pos + direction.copy().setLength(toDefenseDist + 0.03)
			table.insert(result, {startPos: insidePos, startDirection: direction,
				pos: intersections[2].pos, way: intersections[2].way})
		}
	}

	_assignBallCenterbacks (defenders) {
		let ROBOT_TIME_MARGIN_LOW = 0
		let ROBOT_TIME_MARGIN_HIGH = 0.1

		if (defenders.length == 0) {
			return
		}

		let ballDistance = Field.distanceToFriendlyDefenseArea(World.Ball.pos, 0)
		let distanceToDefenseArea = UtilDefense.centerBackDistanceToDefenseArea()
		let defenseExtraRadius = distanceToDefenseArea + Constants.maxRobotRadius
		let intersectionInfos = {}
		if ((ballDistance < 1 ? World.Ball.speed.length() > 0.2) : not Ball.isSlowBall()) {
			this._createIntersections(intersectionInfos, World.Ball.pos, World.Ball.speed, defenseExtraRadius, 1, false)
		}
		let predictedPos, predictedDir, isShot, _, isDribbling = Goal.predictShot(true)
		if ((isShot || isDribbling) ? (predictedPos != World.Ball.pos : predictedDir != World.Ball.speed)) {
			let numBefore = #intersectionInfos
			this._createIntersections(intersectionInfos, predictedPos, predictedDir, defenseExtraRadius, 2, isDribbling)
			if (#intersectionInfos > numBefore) {
				intersectionInfos[numBefore + 1].resetSpeed = true
				intersectionInfos[numBefore + 1].isDribbling = isDribbling
			}
		}
		// remove exit point of predictshot if enough points are available
		if (intersectionInfos[4]) {
			intersectionInfos[4] = nil
		}

		// go over all intersections
		this._centerbackAssignments = {}
		let timeSum = 0
		let currentBall = World.Ball
		for (let info of intersectionInfos) {
			let intersection = geom.intersectLineLine(World.Geometry.FriendlyGoal, new Vector(1, 0),
				info.startPos, info.startDirection)
			let intersectsGoal = intersection && Math.abs(intersection.x) < World.Geometry.GoalWidth / 2 + 0.1
			if (info.resetSpeed) {
				timeSum = timeSum + Physics.ballTravelTime(currentBall, currentBall.pos.distanceTo(info.startPos))
				currentBall = {pos: info.startPos, speed: new Vector(Constants.maxBallSpeed, 0),
					maxSpeed: Constants.maxBallSpeed, posZ: 0, initSpeedZ: 0}
			}
			let rollTime = timeSum + Physics.ballTravelTime(currentBall, currentBall.pos.distanceTo(info.pos))
			if (info.isDribbling) {
				rollTime = rollTime + 0.4
			}
			if (rollTime == Infinity) {
				// other intersections could reach the defense area,
				// since the ball could currently be dribbled
				continue;
			}
			let closestRobot = UtilDefense.getClosestRobot(defenders, info.pos)
			if (not closestRobot) {
				break
			}
			let toGoalLineDistance = intersection ? info.pos.distanceTo(intersection) : 10
			let robotTime = ObserverRobot.timeAroundDefenseAreaByWay(closestRobot, undefined, info.pos, info.way, defenseExtraRadius, true, 3)
			let robotTimeMargin = table.contains(this._centerbackAssignments, closestRobot)  &&
				ROBOT_TIME_MARGIN_LOW || ROBOT_TIME_MARGIN_HIGH
			if ((robotTime + robotTimeMargin < rollTime  ||
					robotTime < rollTime && rollTime < ROBOT_TIME_MARGIN_HIGH  ||
					#this._centerbackAssignments == 0 && intersectsGoal  ||
					rollTime < 0.25 && robotTime < 0.4)  &&
					(toGoalLineDistance >= 0.25 || intersectsGoal)) {
				table.insert(this._centerbackAssignments, closestRobot)
				table.removeValue(defenders, closestRobot)
				this._send.roleAssignment(closestRobot,
					{name = "CenterBack", params: { pos = info.startPos, dir = info.startDirection, time = rollTime }})
				if (not amun.isPerformanceMode) {
					vis.addCircle("tr/defense: ball intersection", info.startPos, 0.08, vis.colors.yellow)
					vis.addCircle("tr/defense: ball intersection", info.pos, 0.12, vis.colors.red)
					vis.addPath("tr/defense: ball intersection", {info.startPos, info.pos}, vis.colors.red)
				}
			}
		}

		// assign default centerbacks
		if (intersectionInfos.length == 0 && defenders.length > 0) {
			// not in opponent corner attacks: assign a ball centerback
			let needDefaultCB = !Referee.isDefensiveCornerKick() && !Referee.isFriendlyFreeKickState()
			if (needDefaultCB) {
				let futureBallPosCB = UtilDefense.calculateBallPosition()
				let defaultCB = UtilDefense.getClosestRobot(defenders, futureBallPosCB)
				if (defaultCB) {
					table.removeValue(defenders, defaultCB)
					this._send.roleAssignment(defaultCB,
						{name = "CenterBack", params: { pos: World.Ball.pos }})
				}
			}
		}
	}

	_assignDefenders () {
		this._previousManmarkAssignments = table.copy(this._manmarkAssignments)
		this._previousPiggyAssignments = table.copy(this._piggyAssignments)
		this._previousBallCenterbacks = table.copy(this._centerbackAssignments)
		this._manmarkAssignments = {}

		if (Referee.isNonGameStage()) {
			return
		}

		this._updateManmarkTargets()
		this._updatePiggyTargets()

		let defenders = table.keys(this._inbox.defenderFlag())

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

		this._assignBallCenterbacks(defenders)

		let nPiggies = determineNumberOfPiggies(#defenders, this._manmarkTargets, this._piggyTargets)
		let nReservedDefenders = nPiggies

		this._assignManmarkDefenders(defenders, nReservedDefenders)
		this._assignPiggies(defenders, nPiggies)
	}
}

function determineNumberOfPiggies (defenderCount: number, manmarkTargets, piggyTargets): number {
	debug.push("piggy count");
	debug.set("defender count", defenderCount);
	let dangerousnessThreshold: number;
	let viabilityThreshold: number;

	if (Referee.isKickoffState()) {
		debug.pop();
		return 0;
	}

	// prioritize manmarks over piggies when in own field half
	// TODO hysteresis

	if (World.Ball.pos.y < 0) {
		dangerousnessThreshold = 0.3;
		viabilityThreshold = 0.8;
	} else {
		dangerousnessThreshold = 0.8;
		viabilityThreshold = 0.3;
	}

	let piggieCount = 0;
	if (!Ball.ballHeadingForGoal(World.Ball, true)
			 ||  World.Ball.speed.length() < 3 || (World.Ball.pos + World.Ball.speed).y > -1) {
		let nRelevantManMarkTargets = 0;
		for (let dangerousness of manmarkTargets.values()) {
			if (dangerousness > dangerousnessThreshold) {
				nRelevantManMarkTargets = nRelevantManMarkTargets + 1;
			}
		}
		debug.set("relevantManMarkTargets", nRelevantManMarkTargets);
		piggieCount = Math.max(0, defenderCount - nRelevantManMarkTargets);
	}

	if (piggieCount > 0) {
		let nRelevantPiggyTargets = 0;
		for (let viability of piggyTargets.values()) {
			if (viability > viabilityThreshold) {
				nRelevantPiggyTargets = nRelevantPiggyTargets + 1;
			}
		}
		debug.set("relevantPiggyTargets", nRelevantPiggyTargets);
		piggieCount = Math.min(piggieCount, nRelevantPiggyTargets);
	}
	debug.pop();
	return piggieCount;
}

function findMostViableTarget (piggyTargets, defenders, previousAssignments: Map<Robot, FriendlyRobot>) {
	let highestViability = -Infinity;
	let mostViableTarget = undefined;
	for (target, viability in pairs(piggyTargets)) {

		// hysteresis
		if (previousAssignments[target]) {
			for (let defender of defenders.values()) {
				if (previousAssignments.get(target) === defender) {
					viability = viability + 0.3;
				}
			}
		}

		if (viability > highestViability) {
			highestViability = viability;
			mostViableTarget = target;
		}

	}

	return mostViableTarget;
}