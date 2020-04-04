import * as Cache from "base/cache";
import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import { FriendlyRobot } from "base/robot";
import { Position, Speed, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import * as Ball from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
import * as Shoot from "glados/observer/shoot";
import * as Defense from "glados/util/defense";
import * as Rating from "glados/util/rating";

let G = World.Geometry;

interface PassInfo {
	target: FriendlyRobot;
	ballPos: Position;
	time: number;
}

interface PassSuggestion {
	ballPos: Position;
	time: number;
	anonymous: boolean;
	chip: boolean;
	manual: boolean;
}

interface PassObject {
	target?: FriendlyRobot;
	ballPos: Position;
	time: number;
	anonymous?: boolean;
	chip?: boolean;
	manual?: boolean;
}

/// evaluates a given pass object
// @name ratePass
// @param robot Robot - the pass sender / main attacker
// @param pass table - a pass object (target: Robot, ballPos: Vector, time: number)
// @param earliestAttackTime - the value of the earliestAttackTime message
// @param considerTiming bool - true if the pass is given as soon as possible, false if we can wait
// @return number - a rating between 0 and 1 (1 = perfect, 0 = poor)
export function _ratePass(robot: FriendlyRobot, pass: PassObject, earliestAttackTime: number | undefined, considerTiming: boolean): number {
	if (robot === World.FriendlyKeeper && G.FieldHeightHalf - Math.abs(pass.ballPos.y) < 4) {
		return 0;
	}
	let rating = 1;

	// if the robot is controlled manually
	if (pass.manual) {
		return 2;
	}

	// rate distance
	let distanceToMA = robot.pos.distanceTo(pass.ballPos);
	rating = rating * (Rating.valueToRating(distanceToMA, 1.5, 2.5) - Rating.valueToRating(distanceToMA, 4, 8));

	// rate timing
	let shootTime;
	if (earliestAttackTime != undefined) {
		shootTime = earliestAttackTime - World.Time;
	} else {
		if (Ball.receivesPass(robot)) {
			let dribblerPos = robot.pos + (World.Ball.pos - robot.pos).setLength(
				robot.shootRadius + World.Ball.radius);
			shootTime = Physics.checkedBallRollTime(World.Ball, dribblerPos);
			if (shootTime === -Infinity) {
				shootTime = Robot.minShootTime(robot, pass.ballPos);
			}
		} else {
			shootTime = Robot.minShootTime(robot, pass.ballPos);
		}
	}

	// Infinity means that the ball can't be reached inside the field
	if (shootTime === Infinity) {
		vis.addCircle("u/a/ratePass: rating", pass.ballPos, 0.2, vis.fromTemperature(1, 127), true);
		return 0;
	}

	let shootPos = Physics.ballAtTime(World.Ball, shootTime).pos;
	let passTime = Shoot.ballPassTime(shootPos, pass.ballPos, pass.target, undefined, robot);
	let ballArrivalTime = shootTime + passTime + World.Time;
	if (considerTiming) {
		rating = rating * (0.1 + Rating.valueToRating(ballArrivalTime - pass.time, -0.1, 0.1) * 0.9);
	}

	// rate volley
	if (Ball.receivesPass(robot)) {
		let volleyAngle = World.Ball.speed.absoluteAngleDiff(shootPos - pass.ballPos);
		let volleyWeight = 0.3;
		let volleyRating = Rating.valueToRating(volleyAngle, 65 / 180 * Math.PI, 50 / 180 * Math.PI);
		rating = rating * (1 - volleyWeight + volleyWeight * volleyRating);
	}

	// rate angle shooter-goal-receiver
	let shooterGoalReceiverAngle = (shootPos - G.OpponentGoal).absoluteAngleDiff(
			pass.ballPos - G.OpponentGoal);
	let shooterGoalReceiverRating = Rating.valueToRating(shooterGoalReceiverAngle, 0, 180 / 180 * Math.PI);
	let shooterGoalReceiverWeight = 0.5;
	rating = rating * (1 - shooterGoalReceiverWeight + shooterGoalReceiverWeight * shooterGoalReceiverRating);

	// rate passes going through or near our own defense area lower
	// this is to lower the chance of a centerback being in the way of a kick,
	// since they won't dodge the pass
	let CROSSING_DEFENSE_AREA_FACTOR = 0.6;
	let defenseAreaDistance = Defense.centerBackDistanceToDefenseArea() + robot.radius + World.Ball.radius + 0.02;
	let intersect = Field.intersectRayDefenseArea(shootPos, pass.ballPos - shootPos, defenseAreaDistance, true)[0];
	// if there is an intersection in the line segment shootPos <-> pass.ballPos
	if (intersect && shootPos.distanceToSq(intersect) < shootPos.distanceToSq(pass.ballPos)) {
		rating = rating * CROSSING_DEFENSE_AREA_FACTOR;
	}

	// rate possible interceptions
	for (let opp of World.OpponentRobots) {

		// check if robot would have to move through defense area to intercept the pass
		let orthogonalProjection = opp.pos.orthogonalProjection(shootPos, pass.ballPos)[0];
		let intersection = Field.intersectRayDefenseArea(opp.pos, orthogonalProjection - opp.pos, 0, false)[0];
		let validIntersection = false;
		if (intersection) {
			validIntersection = Field.isInField(intersection) && opp.pos.distanceTo(intersection) < opp.pos.distanceTo(orthogonalProjection);
			if (validIntersection && !amun.isPerformanceMode) {
				vis.addCircle("u/a/ratePass", intersection, 0.05, vis.colors.red, true);
				vis.addPath("u/a/ratePass", [opp.pos, intersection], vis.colors.slate, true);
			}
		}

		// rate opponent's ability to intercept the pass
		if (!validIntersection && orthogonalProjection.distanceToLineSegment(shootPos, pass.ballPos) < 1
					&&  opp !== World.OpponentKeeper) {
			let passInterception = orthogonalProjection.distanceToLineSegment(shootPos, pass.ballPos) > 0.5
				? pass.ballPos : orthogonalProjection;
			if (!amun.isPerformanceMode) {
				vis.addPath("u/a/ratePass", [opp.pos, passInterception], vis.colors.blue, true);
			}

			// calculate the time the ball needs to arrive at the intersection point
			let shootSpeed = new Vector(1,1).setLength(robot.calculateShootSpeed(3, shootPos.distanceTo(pass.ballPos))); // direction doesn't actually matter
			let fakeBall = {speed: shootSpeed, maxSpeed: shootSpeed.length()};
			let ballRollTime = Physics.ballRollTime(fakeBall, passInterception.distanceTo(shootPos) - World.Ball.radius - opp.shootRadius);
			if (ballRollTime === Infinity) {
				throw new Error("Planning unreachable pass");
			}

			// calculate the time the robot needs to arrive at the intersection point
			// to achieve more relevant results, the speed component parallel to the pass trajectory is ignored
			let projectedSpeed = opp.speed - ((opp.pos + opp.speed).orthogonalProjection(shootPos, pass.ballPos)[0] - orthogonalProjection);
			if (!amun.isPerformanceMode) {
				vis.addPath("u/a/ratePass", [opp.pos, opp.pos + projectedSpeed], vis.colors.pink, true);
			}
			let fakeRobot = {acceleration: opp.acceleration, pos: opp.pos, maxSpeed: opp.maxSpeed, speed: projectedSpeed};

			let timeToPos = 0;
			let minDist = World.Ball.radius + opp.radius;
			if (opp.pos.distanceTo(passInterception) > minDist) {
				let hitPoint = passInterception + (opp.pos - passInterception).setLength(minDist);
				timeToPos = Physics.robotTimeToPos(fakeRobot, hitPoint, new Vector(0,0))[0];
			}

			let passRating = Rating.valueToRating(timeToPos, ballRollTime - 1, ballRollTime + 0.5);
			// uncomment to debug: log("Rating: "+tostring(opp)+", ballRollTime: "+tostring(ballRollTime)+", timeToPos: "+tostring(timeToPos)+", passRating: "+tostring(passRating))
			rating = rating * (passRating / 2 + 0.5);

		}
	}

	let goalAngle = (G.OpponentGoalRight - pass.ballPos).absoluteAngleDiff(G.OpponentGoalLeft - pass.ballPos);
	let goalAngleWeight = 0.5;
	let goalAngleRating = Rating.valueToRating(goalAngle, 0, 50 / 180 * Math.PI);
	rating = rating * (1 - goalAngleWeight + goalAngleWeight * goalAngleRating);

	if (!amun.isPerformanceMode) {
		vis.addCircle("u/a/ratePass", shootPos, 0.1, vis.colors.blue, true);
		vis.addPath("u/a/ratePass", [shootPos, pass.ballPos], vis.colors.red);
	}
	vis.addCircle("u/a/ratePass: rating", pass.ballPos, 0.2,
			vis.fromTemperature(1 - rating, 127), true);

	return rating;
}
export let ratePass = Cache.forFrame(_ratePass);

/// chooses a pass from a list of pass objects using Attack.ratePass
// @name choosePass
// @param robot Robot - the pass sender / main attacker
// @param passes table - a list of pass objects
// @param earliestAttackTime - the value of the earliestAttackTime message
// @param currentPassPos - the ballPos of the last frame, used for stability
// @param considerTiming bool - true if the pass is given as soon as possible, false if we can wait
// @param customHysteresis number - optional: sets the hysteresis bonus, defaults to 0.1
// @return table - the best pass object
export function choosePass(robot: FriendlyRobot, passes: PassObject[], earliestAttackTime: number | undefined,
		currentPassPos?: Position, considerTiming: boolean = false,
		customHysteresis: number = 0.1): [PassObject | undefined, number] {
	let bestPass: PassObject | undefined;
	let bestPassRating = -Infinity;
	for (let pass of passes) {
		let rating = ratePass(robot, pass, earliestAttackTime, considerTiming);
		if (rating > 0) {
			// give a bonus if the pos is near the currentPassPos
			if (currentPassPos) {
				let ratingHystDistance = customHysteresis;
				let ratingHystPercentage = customHysteresis;
				rating = Math.min(1, rating * (1 + ratingHystPercentage *
					Rating.valueToRating(pass.ballPos.distanceTo(currentPassPos), ratingHystDistance, 0)));
			}

			if (rating > bestPassRating) {
				bestPass = pass;
				bestPassRating = rating;
			}
		}
	}

	return [bestPass, bestPassRating];
}

/// chooses a pass from a list of pass suggestions using Attack.ratePass
// @name choosePassFromSuggestions
// @param robot Robot - the pass sender / main attacker
// @param passSuggestions table - all incoming passSuggestion messages
// @param earliestAttackTime - the value of the earliestAttackTime message
// @param currentPassPos - the ballPos of the last frame, used for stability
// @param considerTiming bool - true if the pass is given as soon as possible, false if we can wait
// @param customHysteresis number - optional: sets the hysteresis bonus, defaults to 0.1
// @return table - the best pass object
export function choosePassFromSuggestions(robot: FriendlyRobot, passSuggestions: Map<FriendlyRobot, PassSuggestion>,
		earliestAttackTime: number | undefined, currentPassPos?: Position,
		considerTiming?: boolean, customHysteresis?: number): [PassObject | undefined, number] {
	let passes: PassObject[] = [];
	for (let [sender, sugg] of passSuggestions.entries()) {
		let target: FriendlyRobot | undefined = sender;
		if (sugg.anonymous) {
			target = undefined;
		}
		passes.push({target: target, ballPos: sugg.ballPos, time: sugg.time, manual: sugg.manual });
	}
	return choosePass(robot, passes, earliestAttackTime, currentPassPos, considerTiming, customHysteresis);
}

function sortByRating(a: {rating: number}, b: {rating: number}): number {
	return b.rating - a.rating;
}

/// sorts the passes by their rating
// @name sortPassesFromSuggestions
// @param robot Robot - the pass sender / main attacker
// @param passSuggestions table - all incoming passSuggestion messages
// @param earliestAttackTime - the value of the earliestAttackTime message
// @param currentPassPositions table - the ballPositions of the last frame, used for stability
// @param considerTiming bool - true if the pass is given as soon as possible, false if we can wait
// @param threshold - number between 0 and 1, ratings lower than the threshold won't be included (unless we would have none otherwise)
// @param customHysteresis number - optional: sets the hysteresis bonus, defaults to 0.1
// @return table - list of passes, sorted by their rating
export function sortPassesFromSuggestions(robot: FriendlyRobot, passSuggestions: Map<FriendlyRobot, PassSuggestion>,
		earliestAttackTime: number | undefined, currentPassPositions: Position[] | undefined,
		considerTiming: boolean, threshold: number = 0.5, customHysteresis: number = 0.1) {
	let passes: (PassObject & {rating: number})[] = [];
	for (let [sender, sugg] of passSuggestions.entries()) {
		let pass = {target: sender, ballPos: sugg.ballPos, time: sugg.time};
		let rating = ratePass(robot, pass, earliestAttackTime, considerTiming);
		// give a bonus if the pos is near the currentPassPos
		if (currentPassPositions != undefined) {
			let ratingHystDistance = customHysteresis;
			let ratingHystPercentage = customHysteresis;
			let hystBonus = -Infinity;
			for (let pos of currentPassPositions) {
				let bonus = (1 + ratingHystPercentage *
					Rating.valueToRating(sugg.ballPos.distanceTo(pos), ratingHystDistance, 0));
				if (bonus > hystBonus) {
					hystBonus = bonus;
				}
			}
			rating = rating * hystBonus;
		}

		let target: FriendlyRobot | undefined = sender;
		if (sugg.anonymous) {
			target = undefined;
		}
		passes.push({target: target, ballPos: sugg.ballPos, time: sugg.time, rating: rating, chip: sugg.chip});
	}

	passes.sort(sortByRating);

	for (let i = 1;i < passes.length;i++) {
		if (passes[i].rating < threshold) {
			passes.splice(i, 1);
		}
	}
	return passes.length > 0 ? passes : undefined;
}

/// draws a broad line beween the main attacker (robotPos) and the next attack destination (shootDest)
// @name visualizeAttack
// @param robotPos Vector - the position of the main attacker
// @param shootDest Vector - the position of the next shoot destination
export function visualizeAttack(robotPos: Position, shootDest: Position) {
	let color = World.TeamIsBlue ? vis.fromRGBA(38, 48, 217, 63) : vis.fromRGBA(244, 214, 31, 63);
	vis.addPath("u/a/Attack", [robotPos, shootDest], color, undefined, undefined, 0.1);
}

/// decides whether a robot has to be a main attacker because it will receive a pass
// used in a/a/applyformainattacker
// @param passInfoSender Robot - the sender of the passInfo message
// @param passInfoMessage table - passInfo, for format details see messaging.ts
// @return Robot - the main attacker that receives a pass, or nil
let lastCPMA: FriendlyRobot | undefined = undefined;
let lastPasser: FriendlyRobot | undefined = undefined;
let lastReceiver: FriendlyRobot | undefined = undefined;
let lastCPMATime = 0;
function _currentPlannedMainAttacker(passInfoSender: FriendlyRobot | undefined, passInfoTable: PassInfo[]): FriendlyRobot | undefined {

	if (World.Time - lastCPMATime > 0.2) {
		lastCPMA = undefined;
		// lastCPMATime only gets set if the pass is on the way.
		// at that point lastPasser won't get set -> don't delete lastPasser
		if (lastPasser && !Robot.hadBall(lastPasser,0.2)) {
			lastPasser = undefined;
		}
	}

	let passInfoMessage;
	if (passInfoTable) {
		if (passInfoTable.length > 1) {
			return undefined;
		}
		let passInfoMessage = passInfoTable[0];
		if (passInfoSender != undefined && Robot.hadBall(passInfoSender, 0)) {
			lastPasser = passInfoSender;
			lastReceiver = passInfoMessage.target;
		}
	}

	debug.pushtop("plannedMA");
	debug.set("lastCPMA", lastCPMA);
	debug.set("lastPasser", lastPasser);
	if (lastPasser) {
		debug.set("lastReceiver", lastReceiver || "anonymous");
	} else {
		debug.set("lastReceiver", lastReceiver);
	}
	debug.pop();

	if (lastPasser && Ball.wasShot(0.5) === lastPasser
			&&  World.Ball.speed.length() > 3 && lastReceiver && World.Ball.speed.absoluteAngleDiff(
				lastReceiver.pos - World.Ball.pos) < 45 / 180 * Math.PI) {
		lastCPMA = lastReceiver;
		lastCPMATime = World.Time;
		return lastCPMA;
	}

	if (lastCPMA && World.Ball.speed.length() > 1 && World.Ball.speed.absoluteAngleDiff(
				lastCPMA.pos - World.Ball.pos) < 45 / 180 * Math.PI) {
		lastCPMATime = World.Time;
		return lastCPMA;
	}

	return undefined;
}
export let currentPlannedMainAttacker = Cache.forFrame(_currentPlannedMainAttacker);

/// checks whether we are shooting a goal and returns a position for a path obstacle, or nil
// @param shootDest Vector - the content of the shootDestination message
// @param attackPos Vector - the content of the attackPosition message
// @return Vector - robots should not move between the returned position and the opponent goal
export function shootGoalViewPos(shootDest: Position, attackPos: Position): Position | undefined {
	// if we want to shoot a goal
	if (shootDest) {
		if (G.OpponentGoal.distanceToSq(shootDest) <= G.GoalWidth * G.GoalWidth / 4) {
			return attackPos;
		}
	}

	// if the ball is rolling towards the opponent goal
	if (World.Ball.speed.length() > 3) {
		let [intersection, l1, l2] = geom.intersectLineLine(World.Ball.pos, World.Ball.speed, G.OpponentGoal, new Vector(1, 0));
		if (intersection && Math.abs(l2!) < G.GoalWidth / 2 + 0.2 && l1! > 0) {
			if (Physics.checkedBallRollTime(World.Ball, intersection) < Infinity) {
				return World.Ball.pos;
			}
		}
	}

	return undefined;
}
// Attack.checkForGoalShot = Cache.forFrame(Attack.checkForGoalShot)

const BUFFER_TIME = 0.8;
function printPassInfo(robot: {shootRadius: number} & Physics.RobotLike, passInfo: PassInfo | undefined, hysteresis: boolean | undefined,
		hysteresisPassInfo: PassInfo | undefined) {
	if (passInfo) {
		let robotPos = passInfo.ballPos + (passInfo.ballPos - World.Ball.pos).setLength(robot.shootRadius + World.Ball.radius);
		let robotTime = Math.max(Physics.robotTimeToPos(robot, robotPos, new Vector(0, 0))[0], 0.5);
		let isInOpponentFieldHalf = passInfo.ballPos.y > 0;
		let bufferTime = isInOpponentFieldHalf ? BUFFER_TIME : 1.5 * BUFFER_TIME;
		debug.push("PassInfo");
		debug.set("robotTime", robotTime + bufferTime);
		debug.set("messageTime", passInfo.time - World.Time);
		debug.set("ballTime", Physics.ballTravelTime(World.Ball, World.Ball.pos.distanceTo(passInfo.ballPos)));
		debug.set("passInfoTime", passInfo.time);
		debug.set("hysteresis", hysteresis);
		debug.push("hysteresisPassInfo");
		debug.set("passInfo", hysteresisPassInfo);
		if (hysteresisPassInfo) {
			for (let [k, v] of Object.entries(hysteresisPassInfo)) {
				debug.set("hyseresis " + String(k), v);
			}
		}
		debug.pop();
		debug.pop();
	}
}

// the time between the arrival of the robot and the ball
function calculatePassInfoTiming(robot: {shootRadius: number} & Physics.RobotLike, passInfo: PassInfo | undefined, passIncoming?: boolean, absRobotTime?: number): number {
	if (passInfo != undefined) {
		let robotPos = passInfo.ballPos + (passInfo.ballPos - World.Ball.pos).setLength(robot.shootRadius + World.Ball.radius);
		let robotTime = Math.max(Physics.robotTimeToPos(robot, robotPos, new Vector(0, 0))[0], 0.5, (absRobotTime != undefined ? (absRobotTime - World.Time) : 0));
		let ballTime = passIncoming ? Physics.ballTravelTime(World.Ball, World.Ball.pos.distanceTo(passInfo.ballPos)) : Infinity;
		let messageTime = passInfo.time - World.Time;
		let isInOpponentFieldHalf = passInfo.ballPos.y > 0;
		let bufferTime = isInOpponentFieldHalf ? BUFFER_TIME : 1.5 * BUFFER_TIME;
		return Math.min(messageTime, ballTime) - (robotTime + bufferTime);
	}
	return Infinity;
}

// checks if an attacker has to start to move towards its pass
// @param robot Robot
// @param passInfoTable table - all of the passInfos currently being sent out
// @param lastResult bool - the return value of the last call to this function, or false
// @param absRobotTime number - an alternative time that this robot will take to reach lastPassInfo.pos //TODO: this is used incorrectly when passInfo changes
// @return message - the relevantPassInfoMessage for this robot
// @return bool - if we have to start to move
// @return number - time until we have to start moving
function _checkPassInfos(robot: FriendlyRobot, passInfoTable: PassInfo[], lastResult: boolean | undefined, lastPassInfo: PassInfo | undefined,
		passIncoming?: boolean, absRobotTime?: number): [PassInfo | undefined, boolean, number | undefined] {
	let _relevantPassInfoMessage = relevantPassInfoMessage(robot, passInfoTable);
	printPassInfo(robot, _relevantPassInfoMessage, lastResult, lastPassInfo);
	if (_relevantPassInfoMessage == undefined) {
		return [undefined, false, undefined];
	} else {
		let timeLeft = calculatePassInfoTiming(robot, _relevantPassInfoMessage, passIncoming, absRobotTime);
		return [_relevantPassInfoMessage, lastResult ? timeLeft < 0.5 : timeLeft < 0, timeLeft];
	}
}

let checkedPassInfoPerRobot = new Map<FriendlyRobot, {result: boolean, message: PassInfo | undefined}>();

export function checkPassInfos(robot: FriendlyRobot, passInfoTable: PassInfo[], passIncoming?: boolean, absRobotTime?: number): [boolean, number | undefined] {
	let cachedPassInfo = checkedPassInfoPerRobot[robot];
	let preResult = cachedPassInfo ? cachedPassInfo.result : undefined;
	let preMessage = cachedPassInfo ? cachedPassInfo.message : undefined;
	let [message, result, time] = _checkPassInfos(robot, passInfoTable, preResult, preMessage, passIncoming, absRobotTime);
	checkedPassInfoPerRobot[robot] = {message: message, result: result};
	return [result, time];
}

// checks if an attacker has to start to move towards its pass
// @param robot Robot - to copy its specs
// @param passInfo Message - the passInfo-Message
// @param position Vector - an alternative starting position for the timing calculations
// @param speed Vector - an alternative starting speed for timing, or Vector(0,0)
// @return bool - if we have to start to move
export function checkPassInfoFromPosition(robot: FriendlyRobot, passInfo: PassInfo | undefined, position: Position,
		speed: Speed = new Vector(0,0), passIncoming?: boolean) {
	if (position) {
		let fakeRobot = {
			acceleration: robot.acceleration,
			pos: position,
			maxSpeed: robot.maxSpeed,
			speed: speed,
			shootRadius: robot.shootRadius
		};
		printPassInfo(fakeRobot, passInfo, false, undefined);
		return calculatePassInfoTiming(fakeRobot, passInfo, passIncoming) < 0;
	}
	return false;
}

// returns the passInfo that targets the robot
// @param robot Robot
// @param passInfoTable table - all of the passInfos currently being sent out
// @return Message relevantPassInfoMessage (the passInfo message that targets the robot), undefined if there isn't one
export function relevantPassInfoMessage(robot: FriendlyRobot, passInfoTable: PassInfo[]): PassInfo | undefined {
	let relevantPassInfoMessage = undefined;
	if (passInfoTable != undefined) {
		for (let passInfo of passInfoTable) {
			if (passInfo.target === robot) {
				relevantPassInfoMessage = passInfo;
				break;
			}
		}
	}
	return relevantPassInfoMessage;
}

const MAX_PASS_DESTINATION_FROM_DEFENSE_DISTANCE = 1.5;
export function isPassAllowed(startPos: Position, endPos: Position): boolean {
	let extraDistance = Defense.centerBackDistanceToDefenseArea() + World.Ball.radius + 0.2;
	let intersection = Field.intersectRayDefenseArea(startPos, endPos - startPos, extraDistance, true)[0];
	if (intersection == undefined) {
		return true;
	}
	if (endPos.distanceTo(intersection) < MAX_PASS_DESTINATION_FROM_DEFENSE_DISTANCE) {
		return false;
	}
	if (startPos.distanceToSq(intersection) < startPos.distanceToSq(endPos)) {
		return false;
	}
	return true;
}

/// returns last incoming passInfo for each robot
// @param robot Robot
// @param passInfo Message - passInfo-Message
// @return passInfo Message - last passInfo-Message
let InvalidationCounter = new Map<FriendlyRobot, number>();
let _lastIncomingPassInfo = new Map<FriendlyRobot, PassInfo>();
let lastIPIUpdateTime = new Map<FriendlyRobot, number>();

export function lastIncomingPassInfo(robot: FriendlyRobot, passInfo: [FriendlyRobot, PassInfo[]] | []) {
	let incomingPassInfo = undefined;
	let passInfoTable = passInfo[1];

	if (!InvalidationCounter.has(robot)) {
		InvalidationCounter[robot] = 0;
	}
	if (passInfoTable != undefined) {
		for (let passInfoEntry of passInfoTable) {
// 			TODO?: this code ignores annonymous passes
			if (passInfoEntry.target === robot) {
				incomingPassInfo = passInfoEntry;
			}
		}
	}
	if (lastIPIUpdateTime[robot] && lastIPIUpdateTime[robot] === World.Time) {
		return _lastIncomingPassInfo[robot];
	} else if (incomingPassInfo) {
		_lastIncomingPassInfo[robot] = incomingPassInfo;
		InvalidationCounter[robot] = 0;
		lastIPIUpdateTime[robot] = World.Time;
	} else if (!Ball.isAccelerating() && !Ball.receivesPass(robot)) {
		InvalidationCounter[robot] = InvalidationCounter[robot]! + 1;
		lastIPIUpdateTime[robot] = World.Time;
	}
	if (InvalidationCounter[robot] === 5) {
		_lastIncomingPassInfo.delete(robot);
		InvalidationCounter[robot] = 0;
	}
	return _lastIncomingPassInfo[robot];
}
