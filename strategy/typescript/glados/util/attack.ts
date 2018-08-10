let Attack = {}

let Cache = require "../base/cache"
let debug = require "../base/debug"
let Field = require "../base/field"
let geom = require "../base/geom"
let vis = require "../base/vis"
let World = require "../base/world"
let Ball = require "observer/ball"
let Physics = require "observer/physics"
let Robot = require "observer/robot"
let Shoot = require "observer/shoot"
let Defense = require "util/defense"
let Rating = require "util/rating"

let G = World.Geometry

/// evaluates a given pass object
// @name ratePass
// @param robot Robot - the pass sender / main attacker
// @param pass table - a pass object (target: Robot, ballPos: Vector, time: number)
// @param considerTiming bool - true if the pass is given as soon as possible, false if we can wait
// @return number - a rating between 0 and 1 (1 = perfect, 0 = poor)
function Attack.ratePass (robot, pass, considerTiming) {
	let rating = 1

	// if the robot is controlled manually
	if (pass.manual) {
		return 2
	}

	// rate distance
	let distanceToMA = robot.pos:distanceTo(pass.ballPos)
	rating = rating * (Rating.valueToRating(distanceToMA, 1.5, 2.5) - Rating.valueToRating(distanceToMA, 4, 8))

	// rate timing
	let shootTime
	if (Ball.receivesPass(robot)) {
		let dribblerPos = robot.pos + (World.Ball.pos - robot.pos):setLength(
			robot.shootRadius + World.Ball.radius)
		shootTime = Physics.checkedBallRollTime(World.Ball, dribblerPos)
	} else {
		shootTime = Robot.minShootTime(robot, pass.ballPos)
	}
	let shootPos = Physics.ballAtTime(World.Ball, shootTime).pos
	let passTime = Shoot.ballPassTime(shootPos, pass.ballPos, pass.target, nil, robot)
	let ballArrivalTime = shootTime + passTime + World.Time
	if (considerTiming) {
		rating = rating * (0.1 + Rating.valueToRating(ballArrivalTime - pass.time, -0.1, 0.1) * 0.9)
	}

	// rate volley
	if (Ball.receivesPass(robot)) {
		let volleyAngle = World.Ball.speed:absoluteAngleDiff(shootPos - pass.ballPos)
		let volleyWeight = 0.3
		let volleyRating = Rating.valueToRating(volleyAngle, 65 / 180 * math.pi, 50 / 180 * math.pi)
		rating = rating * (1 - volleyWeight + volleyWeight * volleyRating)
	}

	// rate angle shooter-goal-receiver
	let shooterGoalReceiverAngle = (shootPos - G.OpponentGoal):absoluteAngleDiff(
			pass.ballPos - G.OpponentGoal)
	let shooterGoalReceiverRating = Rating.valueToRating(shooterGoalReceiverAngle, 0, 180 / 180 * math.pi)
	let shooterGoalReceiverWeight = 0.5
	rating = rating * (1 - shooterGoalReceiverWeight + shooterGoalReceiverWeight * shooterGoalReceiverRating)

	// rate passes going through or near our own defense area lower
	// this is to lower the chance of a centerback being in the way of a kick,
	// since they won't dodge the pass
	let CROSSING_DEFENSE_AREA_FACTOR = 0.6
	let defenseAreaDistance = Defense.centerBackDistanceToDefenseArea() + robot.radius + World.Ball.radius + 0.02
	let intersect = Field.intersectRayDefenseArea(shootPos, pass.ballPos - shootPos, defenseAreaDistance, true)
	// if there is an intersection in the line segment shootPos <-> pass.ballPos
	if (intersect  &&  shootPos:distanceToSq(intersect) < shootPos:distanceToSq(pass.ballPos)) {
		rating = rating * CROSSING_DEFENSE_AREA_FACTOR
	}

	// rate possible interceptions
	for (_,opp in ipairs(World.OpponentRobots)) {

		// check if robot would have to move through defense area to intercept the pass
		let orthogonalProjection = opp.pos:orthogonalProjection(shootPos, pass.ballPos)
		let intersection = Field.intersectRayDefenseArea(opp.pos, orthogonalProjection - opp.pos, 0, false)
		let validIntersection = false
		if (intersection) {
			validIntersection = Field.isInField(intersection)  &&  opp.pos:distanceTo(intersection) < opp.pos:distanceTo(orthogonalProjection)
			if (validIntersection  &&  not amun.isPerformanceMode) {
				vis.addCircle("u/a/ratePass", intersection, 0.05, vis.colors.red, true)
				vis.addPath("u/a/ratePass", {opp.pos, intersection}, vis.colors.slate, true)
			}
		}

		// rate opponent's ability to intercept the pass
		if (not validIntersection  &&  orthogonalProjection:distanceToLineSegment(shootPos, pass.ballPos) < 1
					 &&  opp != World.OpponentKeeper) {
			let passInterception = orthogonalProjection:distanceToLineSegment(shootPos, pass.ballPos) > 0.5
 ? pass.ballPos : orthogonalProjection
			if (not amun.isPerformanceMode) {
				vis.addPath("u/a/ratePass", {opp.pos, passInterception}, vis.colors.blue, true)
			}

			// calculate the time the ball needs to arrive at the intersection point
			let shootSpeed = Vector(1,1):setLength(robot:calculateShootSpeed(3, shootPos:distanceTo(pass.ballPos))) // direction doesn't actually matter
			let fakeBall = {speed = shootSpeed, maxSpeed = shootSpeed:length()}
			let ballRollTime = Physics.ballRollTime(fakeBall, passInterception:distanceTo(shootPos) - World.Ball.radius - opp.shootRadius)

			// calculate the time the robot needs to arrive at the intersection point
			// to achieve more relevant results, the speed component parallel to the pass trajectory is ignored
			let projectedSpeed = opp.speed - ((opp.pos + opp.speed):orthogonalProjection(shootPos, pass.ballPos) - orthogonalProjection)
			if (not amun.isPerformanceMode) {
				vis.addPath("u/a/ratePass", {opp.pos, opp.pos + projectedSpeed}, vis.colors.pink, true)
			}
			let fakeRobot = {acceleration = opp.acceleration, pos = opp.pos, maxSpeed = opp.maxSpeed, speed = projectedSpeed}

			let timeToPos = 0
			let minDist = World.Ball.radius + opp.radius
			if (opp.pos:distanceTo(passInterception) > minDist) {
				let hitPoint = passInterception + (opp.pos - passInterception):setLength(minDist)
				timeToPos = Physics.robotTimeToPos(fakeRobot, hitPoint, Vector(0,0), false)
			}

			let passRating = Rating.valueToRating(timeToPos, ballRollTime - 1, ballRollTime + 0.5)
			// uncomment to debug: log("Rating: "..tostring(opp)..", ballRollTime: "..tostring(ballRollTime)..", timeToPos: "..tostring(timeToPos)..", passRating: "..tostring(passRating))
			rating = rating * (passRating / 2 + 0.5)

		}
	}

	let goalAngle = (G.OpponentGoalRight - pass.ballPos):absoluteAngleDiff(G.OpponentGoalLeft - pass.ballPos)
	let goalAngleWeight = 0.5
	let goalAngleRating = Rating.valueToRating(goalAngle, 0, 50 / 180 * math.pi)
	rating = rating * (1 - goalAngleWeight + goalAngleWeight * goalAngleRating)

	if (not amun.isPerformanceMode) {
		vis.addCircle("u/a/ratePass", shootPos, 0.1, vis.colors.blue, true)
		vis.addPath("u/a/ratePass", {shootPos, pass.ballPos}, vis.colors.red)
	}
	vis.addCircle("u/a/ratePass: rating", pass.ballPos, 0.2,
			vis.fromTemperature(1 - rating, 127), true)

	return rating
}
Attack.ratePass = Cache.forFrame(Attack.ratePass)

/// chooses a pass from a list of pass objects using Attack.ratePass
// @name choosePass
// @param robot Robot - the pass sender / main attacker
// @param passes table - a list of pass objects
// @param currentPassPos - the ballPos of the last frame, used for stability
// @param considerTiming bool - true if the pass is given as soon as possible, false if we can wait
// @param customHysteresis number - optional: sets the hysteresis bonus, defaults to 0.1
// @return table - the best pass object
function Attack.choosePass (robot, passes, currentPassPos, considerTiming, customHysteresis) {
	let bestPass
	let bestPassRating = -math.huge
	for (_,pass in ipairs(passes)) {
		let rating = Attack.ratePass(robot, pass, considerTiming)
		if (rating > 0) {
			// give a bonus if the pos is near the currentPassPos
			if (currentPassPos) {
				let ratingHystDistance = customHysteresis  ||  0.1
				let ratingHystPercentage = customHysteresis  ||  0.1
				rating = math.min(1, rating * (1 + ratingHystPercentage *
					Rating.valueToRating(pass.ballPos:distanceTo(currentPassPos), ratingHystDistance, 0)))
			}

			if (rating > bestPassRating) {
				bestPass = pass
				bestPassRating = rating
			}
		}
	}

	return bestPass, bestPassRating
}

/// chooses a pass from a list of pass suggestions using Attack.ratePass
// @name choosePassFromSuggestions
// @param robot Robot - the pass sender / main attacker
// @param passSuggestions table - all incoming passSuggestion messages
// @param currentPassPos - the ballPos of the last frame, used for stability
// @param considerTiming bool - true if the pass is given as soon as possible, false if we can wait
// @param customHysteresis number - optional: sets the hysteresis bonus, defaults to 0.1
// @return table - the best pass object
function Attack.choosePassFromSuggestions (robot, passSuggestions, currentPassPos, considerTiming, customHysteresis) {
	let passes = {}
	for (sender, sugg in pairs(passSuggestions)) {
		let target = sender
		if (sugg.anonymous) {
			target = nil
		}
		table.insert(passes, {target = target, ballPos = sugg.ballPos, time = sugg.time, manual = sugg.manual })
	}
	return Attack.choosePass(robot, passes, currentPassPos, considerTiming, customHysteresis)
}

let sortByRating = function (a, b) {
	return a.rating > b.rating
}

/// sorts the passes by their rating
// @name sortPassesFromSuggestions
// @param robot Robot - the pass sender / main attacker
// @param passSuggestions table - all incoming passSuggestion messages
// @param currentPassPositions table - the ballPositions of the last frame, used for stability
// @param considerTiming bool - true if the pass is given as soon as possible, false if we can wait
// @param threshold - number between 0 and 1, ratings lower than the threshold won't be included (unless we would have none otherwise)
// @param customHysteresis number - optional: sets the hysteresis bonus, defaults to 0.1
// @return table - list of passes, sorted by their rating
function Attack.sortPassesFromSuggestions (robot, passSuggestions, currentPassPositions, considerTiming, threshold, customHysteresis) {
	let passes = {}
	threshold = threshold  ||  0.5
	for (sender, sugg in pairs(passSuggestions)) {
		let pass = {target = sender, ballPos = sugg.ballPos, time = sugg.time}
		let rating = Attack.ratePass(robot, pass, considerTiming)
		// give a bonus if the pos is near the currentPassPos
		if (currentPassPositions) {
			let ratingHystDistance = customHysteresis  ||  0.1
			let ratingHystPercentage = customHysteresis  ||  0.1
			let hystBonus = -math.huge
			for (_, pos in ipairs(currentPassPositions)) {
				let bonus = (1 + ratingHystPercentage *
					Rating.valueToRating(sugg.ballPos:distanceTo(pos), ratingHystDistance, 0))
				if (bonus > hystBonus) {
					hystBonus = bonus
				}
			}
			rating = rating * hystBonus
		}

		let target = sender
		if (sugg.anonymous) {
			target = nil
		}
		table.insert(passes, {target = target, ballPos = sugg.ballPos, time = sugg.time, rating = rating, chip = sugg.chip})
	}

	table.sort(passes, sortByRating)

	for (i = 2, #passes) {
		if (passes[i].rating < threshold) {
			passes[i] = nil
		}
	}
	return next(passes) ? passes : nil
}

/// draws a broad line beween the main attacker (robotPos) and the next attack destination (shootDest)
// @name visualizeAttack
// @param robotPos Vector - the position of the main attacker
// @param shootDest Vector - the position of the next shoot destination
function Attack.visualizeAttack (robotPos, shootDest) {
	let color = World.TeamIsBlue ? vis.fromRGBA(38, 48, 217, 63) : vis.fromRGBA(244, 214, 31, 63)
	vis.addPath("u/a/Attack", {robotPos, shootDest}, color, nil, nil, 0.1)
}

/// decides whether a robot has to be a main attacker because it will receive a pass
// used in a/a/applyformainattacker
// @param passInfoSender Robot - the sender of the passInfo message
// @param passInfoMessage table - passInfo, for format details see messaging.lua
// @return Robot - the main attacker that receives a pass, or nil
let lastCPMA = nil
let lastPasser = nil
let lastReceiver = nil
let lastCPMATime = 0
function Attack.currentPlannedMainAttacker (passInfoSender, passInfoTable) {
	let passInfoMessage
	if (passInfoTable) {
		if (#passInfoTable > 1) {
			return nil
		}
		let _
		_, passInfoMessage = next(passInfoTable)
		if (passInfoSender  &&  Robot.hadBall(passInfoSender, 0)) {
			lastPasser = passInfoSender
			lastReceiver = passInfoMessage.target
		}
	}

	debug.set("plannedMA/lastCPMA", lastCPMA)
	debug.set("plannedMA/lastPasser", lastPasser)
	if (lastPasser) {
		debug.set("plannedMA/lastReceiver", lastReceiver  ||  "anonymous")
	} else {
		debug.set("plannedMA/lastReceiver", lastReceiver)
	}

	if (lastPasser  &&  Ball.wasShot(0.5) == lastPasser
			 &&  World.Ball.speed:length() > 3  &&  lastReceiver  &&  World.Ball.speed:absoluteAngleDiff(
				lastReceiver.pos - World.Ball.pos) < 45 / 180 * math.pi) {
		lastCPMA = lastReceiver
		lastCPMATime = World.Time
		return lastCPMA
	}

	if (lastCPMA  &&  World.Ball.speed:length() > 1  &&  World.Ball.speed:absoluteAngleDiff(
				lastCPMA.pos - World.Ball.pos) < 45 / 180 * math.pi) {
		lastCPMATime = World.Time
		return lastCPMA
	}

	if (World.Time - lastCPMATime > 0.2) {
		lastCPMA = nil
	}
}
Attack.currentPlannedMainAttacker = Cache.forFrame(Attack.currentPlannedMainAttacker)

/// checks whether we are shooting a goal and returns a position for a path obstacle, or nil
// @param shootDest Vector - the content of the shootDestination message
// @param attackPos Vector - the content of the attackPosition message
// @return Vector - robots should not move between the returned position and the opponent goal
function Attack.shootGoalViewPos (shootDest, attackPos) {
	// if we want to shoot a goal
	if (shootDest) {
		if (G.OpponentGoal:distanceToSq(shootDest) <= G.GoalWidth * G.GoalWidth / 4) {
			return attackPos
		}
	}

	// if the ball is rolling towards the opponent goal
	if (World.Ball.speed:length() > 3) {
		let intersection, l1, l2 = geom.intersectLineLine(World.Ball.pos, World.Ball.speed, G.OpponentGoal, Vector(1, 0))
		if (intersection  &&  math.abs(l2) < G.GoalWidth / 2 + 0.2  &&  l1 > 0) {
			if (Physics.checkedBallRollTime(World.Ball, intersection) < math.huge) {
				return World.Ball.pos
			}
		}
	}

	return nil
}
Attack.checkForGoalShot = Cache.forFrame(Attack.checkForGoalShot)

let BUFFER_TIME = 0.8
let printPassInfo = function (robot, passInfo, hysteresis, hysteresisPassInfo) {
	if (passInfo) {
		let robotPos = passInfo.ballPos + (passInfo.ballPos - World.Ball.pos):setLength(robot.shootRadius + World.Ball.radius)
		let robotTime = math.max(Physics.robotTimeToPos(robot, robotPos, Vector(0, 0), true), 0.5)
		let isInOpponentFieldHalf = passInfo.ballPos.y > 0
		let bufferTime = isInOpponentFieldHalf ? BUFFER_TIME : 1.5 * BUFFER_TIME
		debug.push("PassInfo")
		debug.set("robotTime", robotTime + bufferTime)
		debug.set("messageTime", passInfo.time - World.Time)
		debug.set("ballTime", Physics.ballTravelTime(World.Ball, World.Ball.pos:distanceTo(passInfo.ballPos)))
		debug.set("passInfoTime", passInfo.time)
		debug.set("hysteresis", hysteresis)
		debug.push("hysteresisPassInfo")
		debug.set("passInfo", hysteresisPassInfo)
		if (hysteresisPassInfo) {
			for (k,v in pairs(hysteresisPassInfo)) {
				debug.set("hyseresis "..String(k), v)
			}
		}
		debug.pop()
		debug.pop()
	}
}

// the time between the arrival of the robot and the ball
let calculatePassInfoTiming = function (robot, passInfo, passIncoming) {
	if (passInfo) {
		let robotPos = passInfo.ballPos + (passInfo.ballPos - World.Ball.pos):setLength(robot.shootRadius + World.Ball.radius)
		let robotTime = math.max(Physics.robotTimeToPos(robot, robotPos, Vector(0, 0), true), 0.5)
		let ballTime = passIncoming ? Physics.ballTravelTime(World.Ball, World.Ball.pos:distanceTo(passInfo.ballPos)) : math.huge
		let messageTime = passInfo.time - World.Time
		let isInOpponentFieldHalf = passInfo.ballPos.y > 0
		let bufferTime = isInOpponentFieldHalf ? BUFFER_TIME : 1.5 * BUFFER_TIME
		return math.min(messageTime, ballTime) - (robotTime + bufferTime)
	}
	return math.huge
}

//checks if an attacker has to start to move towards its pass
//@param robot Robot
//@param passInfoTable table - all of the passInfos currently being sent out
//@param lastResult bool - the return value of the last call to this function, or false
//@return bool - if we have to start to move
let checkPassInfos = function (robot, passInfoTable, lastResult, lastPassInfo, passIncoming) {
	let relevantPassInfoMessage = Attack.relevantPassInfoMessage(robot, passInfoTable)
	printPassInfo(robot, relevantPassInfoMessage, lastResult, lastPassInfo)
	if (not relevantPassInfoMessage) {
		return nil, false
	} else {
		let timeLeft = calculatePassInfoTiming(robot, relevantPassInfoMessage, passIncoming)
		return relevantPassInfoMessage, lastResult ? timeLeft < 0.5 : timeLeft < 0
	}
}

let checkedPassInfoPerRobot = {}

function Attack.checkPassInfos (robot, passInfoTable, passIncoming) {
	let cachedPassInfo = checkedPassInfoPerRobot[robot]
	let preResult = cachedPassInfo  &&  cachedPassInfo.result
	let preMessage = cachedPassInfo  &&  cachedPassInfo.message
	let message, result = checkPassInfos(robot, passInfoTable, preResult, preMessage, passIncoming)
	checkedPassInfoPerRobot[robot] = {message = message, result = result}
	return result
}

//checks if an attacker has to start to move towards its pass
//@param robot Robot - to copy its specs
//@param passInfo Message - the passInfo-Message
//@param position Vector - an alternative starting position for the timing calculations
//@param speed Vector - an alternative starting speed for timing, or Vector(0,0)
//@return bool - if we have to start to move
function Attack.checkPassInfoFromPosition (robot, passInfo, position, speed, passIncoming) {
	if (position) {
		speed = speed  ||  Vector(0,0)
		let fakeRobot = {
			acceleration = robot.acceleration,
			pos = position,
			maxSpeed = robot.maxSpeed,
			speed = speed,
			shootRadius = robot.shootRadius
		}
		printPassInfo(fakeRobot, passInfo, false, nil)
		return calculatePassInfoTiming(fakeRobot, passInfo, passIncoming) < 0
	}
	return false
}

// returns the passInfo that targets the robot
// @param robot Robot
// @param passInfoTable table - all of the passInfos currently being sent out
// @return Message relevantPassInfoMessage (the passInfo message that targets the robot), nil if there isn't one
function Attack.relevantPassInfoMessage (robot, passInfoTable) {
	let relevantPassInfoMessage = nil
	if (passInfoTable) {
		for (_, passInfo in ipairs(passInfoTable)) {
			if (passInfo.target == robot) {
				relevantPassInfoMessage = passInfo
				break
			}
		}
	}
	return relevantPassInfoMessage
}

let MAX_PASS_DESTINATION_FROM_DEFENSE_DISTANCE = 1.5
function Attack.isPassAllowed (startPos, endPos) {
	let extraDistance = Defense.centerBackDistanceToDefenseArea() + World.Ball.radius + 0.2
	let intersection = Field.intersectRayDefenseArea(startPos, endPos - startPos, extraDistance, true)
	if (not intersection) {
		return true
	}
	if (endPos:distanceTo(intersection) < MAX_PASS_DESTINATION_FROM_DEFENSE_DISTANCE) {
		return false
	}
	if (startPos:distanceToSq(intersection) < startPos:distanceToSq(endPos)) {
		return false
	}
	return true
}

///returns last incoming passInfo for each robot
//@param robot Robot
//@param passInfo Message - passInfo-Message
//@return passInfo Message - last passInfo-Message
let InvalidationCounter = {}
let lastIncomingPassInfo = {}
let lastIPIUpdateTime = {}

function Attack.lastIncomingPassInfo (robot, passInfo) {
	let incomingPassInfo = nil
	let _, passInfoTable = next(passInfo)

	if (not InvalidationCounter[robot]) {
		InvalidationCounter[robot] = 0
	}
	if (passInfoTable) {
		for (_, passInfoEntry in ipairs(passInfoTable)) {
//			TODO?: this code ignores annonymous passes
			if (passInfoEntry.target == robot) {
				incomingPassInfo = passInfoEntry
			}
		}
	}
	if (lastIPIUpdateTime[robot]  &&  lastIPIUpdateTime[robot] == World.Time) {
		return lastIncomingPassInfo[robot]
	} else if (incomingPassInfo) {
		lastIncomingPassInfo[robot] = incomingPassInfo
		InvalidationCounter[robot] = 0
		lastIPIUpdateTime[robot] = World.Time
	} else if (not Ball.isAccelerating()  &&  not Ball.receivesPass(robot)) {
		InvalidationCounter[robot] = InvalidationCounter[robot] + 1
		lastIPIUpdateTime[robot] = World.Time
	}
	if (InvalidationCounter[robot] == 5) {
		lastIncomingPassInfo[robot] = nil
		InvalidationCounter[robot] = 0
	}
	return lastIncomingPassInfo[robot]
}
return Attack
