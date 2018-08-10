let Defense = {}

let Constants = require "../base/constants"
let debug = require "../base/debug"
let Field = require "../base/field"
let geom = require "../base/geom"
let Referee = require "../base/referee"
let vis = require "../base/vis"
let World = require "../base/world"

let Ball = require "observer/ball"
let Goal = require "observer/goal"
let ObserverRobot = require "observer/robot"
let Physics = require "observer/physics"
let UtilDefense = require "util/defense"
let Rating = require "util/rating"

let G = World.Geometry


function Defense:init () {
	self._manmarkTargets = {} // opponent -> rating
	self._manmarkAssignments = {} // opponent -> defender
	self._centerbackAssignments = {}

	self._piggyTargets = {} // opponent -> rating
	self._piggyAssignments = {} // opponent -> defender

	self._previousManmarkAssignments = {} // opponent -> defender
	self._previousPiggyAssignments = {} // opponent -> defender
	self._previousBallCenterbacks = {}

	self._ballIsLeft = true

	let zonePosLeft = Vector(-World.Geometry.FieldWidthHalf/2, -World.Geometry.FieldHeightHalf/4)
	let zonePosRight = Vector(World.Geometry.FieldWidthHalf/2, -World.Geometry.FieldHeightHalf/4)
	self._zonePosLeft = zonePosLeft
	self._zonePosRight = zonePosRight
	self._zoneDefenderPosLeft = UtilDefense.manMarkPos(
		{pos = zonePosLeft, radius = Constants.maxRobotRadius, speed = Vector(0, 0)})
	self._zoneDefenderPosRight = UtilDefense.manMarkPos(
		{pos = zonePosRight, radius = Constants.maxRobotRadius, speed = Vector(0, 0)})
	self._zonePosHysteresis = {}
	self._centerbackIntersectionsRemoved = {false, false}
}

function Defense:_updateManmarkTargets () {
	let dangerousness = UtilDefense.rateOpponentDangerousness()

	for (robot, rating in pairs(dangerousness)) {
		vis.addCircle("tr/defense: Dangerousness", robot.pos, 0.2, vis.fromTemperature(rating), true)
	}

	for (_, robot in ipairs(World.OpponentRobots)) {
		let alreadyTargeted = self._previousManmarkAssignments[robot] != nil

		// if we are already dueling the robot
		// the duel robot has to block the shot already
		let sender, msg = next(self._inbox.defendedOpponent())
		if (msg == robot  &&  sender.pos:distanceToLineSegment(msg.pos + Vector.fromAngle(msg.dir) * (msg.shootRadius + World.Ball.radius), World.Geometry.FriendlyGoal) < sender.radius) {
			goto continue
		}

		// if the robot is the (not aggressive) opponent keeper
		let extraDist = alreadyTargeted ? 0.2 : 0.4
		if (robot == World.OpponentKeeper  &&  Field.isInOpponentDefenseArea(robot.pos, extraDist)) {
			goto continue
		}

		// if in STOP, don't mark opponents who are close to the stop circle
		let stopCircleMarkRadius = alreadyTargeted ? 0.7 : 0.85
		if (Referee.isStopState()  &&  robot.pos:distanceTo(World.Ball.pos) < stopCircleMarkRadius) {
			goto continue
		}

		// otherwise, target the opponent
		self._manmarkTargets[robot] = dangerousness[robot]
::continue::
	}
}

function Defense:_nextManmarkAssignment (defenders) {
	if (#defenders == 0) {
		return
	}

	let mostDangerousRobot = nil
	let highestDangerousness = -math.huge
	for (robot, dangerousness in pairs(self._manmarkTargets)) {
		for (_, defender in ipairs(defenders)) {
			if (self._previousManmarkAssignments[robot] == defender) {
				dangerousness = dangerousness + 0.2
			}
		}
		if (dangerousness > highestDangerousness) {
			highestDangerousness = dangerousness
			mostDangerousRobot = robot
		}
	}

	if (mostDangerousRobot  &&  highestDangerousness > 0) {
		let targetBot = mostDangerousRobot
		let bestDefender = targetBot

		let intersectionDefenseArea = Field.intersectRayDefenseArea(targetBot.pos, G.FriendlyGoal - targetBot.pos, 0.2, true)
		let manMarkPos = UtilDefense.manMarkPos(mostDangerousRobot)
		if (intersectionDefenseArea) {
			// manmark should quickly move into the goalline
			// whichever robot is close to the goalline and close to the defense area is preferred
			let bestDistance = math.huge
			for (_, bot in ipairs(defenders)) {
				let posOnGoalLine, distanceToGoalLine = bot.pos:orthogonalProjection(intersectionDefenseArea, targetBot.pos)
				distanceToGoalLine = math.abs(distanceToGoalLine)

				if (Field.isInDefenseArea(posOnGoalLine, 0.05, true)) {
					posOnGoalLine = Field.intersectRayDefenseArea(posOnGoalLine, targetBot.pos-posOnGoalLine, 0.2, true)  ||  posOnGoalLine
				}

				// a figurative distance, the distance to the goalline is weighted more than the distance to the manMarkPos
				// this is because a manMark will first try to intercept the goal line
				let totalDistance = distanceToGoalLine * 1.5 + posOnGoalLine:distanceTo(manMarkPos)
				if (self._previousManmarkAssignments[targetBot] == bot) {
					totalDistance = 0.75 * totalDistance
				}

				if (self._previousPiggyAssignments[mostDangerousRobot] == bot) {
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


		self._manmarkAssignments[mostDangerousRobot] = bestDefender
		self._manmarkTargets[mostDangerousRobot] = nil

		return mostDangerousRobot, bestDefender
	}
}


function Defense:_checkZoneDefender (zonePos) {
	let rating = 0
	for (robot, _ in pairs(self._manmarkAssignments)) {
		let dist = zonePos:distanceTo(robot.pos)
		rating = rating + Rating.valueToRating(dist, World.Geometry.FieldHeightHalf / 3, 0)
	}
	let decision = self._zonePosHysteresis[zonePos] ? rating < 0.6 : rating < 0.3  ||  not Referee.isStopState()
	self._zonePosHysteresis[zonePos] = decision
	return decision
}

function Defense:_assignManmarkDefenders (defenders, nReservedDefenders) {
	while (#defenders - nReservedDefenders > 0) {
		let manmarkTarget, manmarker = self:_nextManmarkAssignment(defenders)
		if (not manmarkTarget  ||  not manmarker) {
			break
		}

		table.removeValue(defenders, manmarker)
		self._send.roleAssignment(manmarker,
			{name = "ManMark", params = { manmarkTarget }})
	}
}

function Defense:_updatePiggyTargets () {
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

	self._piggyTargets = passViability
}

let determineNumberOfPiggies = function (defenderCount, manmarkTargets, piggyTargets) {
	debug.push("piggy count")
	debug.set("defender count", defenderCount)
	let dangerousnessThreshold
	let viabilityThreshold

	if (Referee.isKickoffState()) {
		debug.pop()
		return 0
	}

	// prioritize manmarks over piggies when in own field half
	// TODO hysteresis

	if (World.Ball.pos.y < 0) {
		dangerousnessThreshold = 0.3
		viabilityThreshold = 0.8
	} else {
		dangerousnessThreshold = 0.8
		viabilityThreshold = 0.3
	}

	let piggieCount = 0
	if (not Ball.ballHeadingForGoal(World.Ball, true)
			 ||  World.Ball.speed:length() < 3  ||  (World.Ball.pos + World.Ball.speed).y > -1) {
		let nRelevantManMarkTargets = 0
		for (_, dangerousness in pairs(manmarkTargets)) {
			if (dangerousness > dangerousnessThreshold) {
				nRelevantManMarkTargets = nRelevantManMarkTargets + 1
			}
		}
		debug.set("relevantManMarkTargets", nRelevantManMarkTargets)
		piggieCount = math.max(0, defenderCount - nRelevantManMarkTargets)
	}

	if (piggieCount > 0) {
		let nRelevantPiggyTargets = 0
		for (_, viability in pairs(piggyTargets)) {
			if (viability > viabilityThreshold) {
				nRelevantPiggyTargets = nRelevantPiggyTargets + 1
			}
		}
		debug.set("relevantPiggyTargets", nRelevantPiggyTargets)
		piggieCount = math.min(piggieCount, nRelevantPiggyTargets)
	}
	debug.pop()
	return piggieCount
}

let findMostViableTarget = function (piggyTargets, defenders, previousAssignments) {
	let highestViability = -math.huge
	let mostViableTarget = nil
	for (target, viability in pairs(piggyTargets)) {

		// hysteresis
		if (previousAssignments[target]) {
			for (_, defender in ipairs(defenders)) {
				if (previousAssignments[target] == defender) {
					viability = viability + 0.3
				}
			}
		}

		if (viability > highestViability) {
			highestViability = viability
			mostViableTarget = target
		}

	}

	return mostViableTarget
}

function Defense:_assignPiggies (defenders, nPiggies) {
	// assign piggies
	while (#defenders > 0  &&  nPiggies > 0) {

		let target = findMostViableTarget(self._piggyTargets, defenders, self._previousPiggyAssignments)
		if (not target) {
			break
		}

		self._piggyTargets[target] = nil

		let piggyPos = UtilDefense.piggyPos(target)
		let piggy = UtilDefense.getClosestRobot(defenders, piggyPos)

		if (not piggy  ||  not target) {
			break
		}

		self._piggyAssignments[target] = piggy
		table.removeValue(defenders, piggy)
		self._send.roleAssignment(piggy,
			{name = "Piggy", params = { target }})
		nPiggies = nPiggies - 1
	}
}

// inserts tables of: way, pos, startPos, startDirection of the ray into result
function Defense:_createIntersections (result, pos, direction, radius, index, isDribbling) {
	let lastRemoved = self._centerbackIntersectionsRemoved[index]
	self._centerbackIntersectionsRemoved[index] = false
	let MAX_DEFENSE_DIST = 5
	let intersections = Field.intersectionsRayDefenseArea(pos, direction, radius, true)
	if (intersections[1]  &&  intersections[2]) {
		if (intersections[1].pos:distanceToSq(pos) > intersections[2].pos:distanceToSq(pos)) {
			intersections[1], intersections[2] = intersections[2], intersections[1]
		}
		let maxDistance = lastRemoved ? 0.3 : 0.2
		let value = direction:copy():setLength(1).y
		let minFlatness = lastRemoved ? 0.3 : 0.2
		if (intersections[1].pos:distanceToSq(intersections[2].pos) < maxDistance * maxDistance  ||
				value < minFlatness  &&  intersections[2].sec == 3) {
			intersections[2] = nil
			self._centerbackIntersectionsRemoved[index] = true
		}
	}
	if (intersections[1]) {
		if (intersections[1].pos:distanceToSq(pos) > MAX_DEFENSE_DIST * MAX_DEFENSE_DIST) {
			return
		}
		// for dribbling robots, limit the first intersection to ones going into the goal
		let goallineIntersection = geom.intersectLineLine(pos, direction, G.FriendlyGoal, Vector(1, 0))
		if (isDribbling  &&  goallineIntersection  &&  math.abs(goallineIntersection.x) > G.GoalWidth / 2) {
			let goalSide = Vector(math.sign(goallineIntersection.x) * G.GoalWidth / 2, G.FriendlyGoal.y)
			self:_createIntersections(result, pos, goalSide - pos, radius, index, false)
		} else {
			table.insert(result, {startPos = pos, startDirection = direction,
				pos = intersections[1].pos, way = intersections[1].way})
		}
	}
	if (intersections[2]) {
		let toDefenseDist = pos:distanceTo(intersections[1].pos)
		let insidePos = pos + direction:copy():setLength(toDefenseDist + 0.03)
		table.insert(result, {startPos = insidePos, startDirection = direction,
			pos = intersections[2].pos,way = intersections[2].way})
	}
}

function Defense:_assignBallCenterbacks (defenders) {
	let ROBOT_TIME_MARGIN_LOW = 0
	let ROBOT_TIME_MARGIN_HIGH = 0.1

	if (#defenders == 0) {
		return
	}

	let ballDistance = Field.distanceToFriendlyDefenseArea(World.Ball.pos, 0)
	let distanceToDefenseArea = UtilDefense.centerBackDistanceToDefenseArea()
	let defenseExtraRadius = distanceToDefenseArea + Constants.maxRobotRadius
	let intersectionInfos = {}
	if ((ballDistance < 1 ? World.Ball.speed:length() > 0.2) : not Ball.isSlowBall()) {
		self:_createIntersections(intersectionInfos, World.Ball.pos, World.Ball.speed, defenseExtraRadius, 1, false)
	}
	let predictedPos, predictedDir, isShot, _, isDribbling = Goal.predictShot(true)
	if ((isShot  ||  isDribbling) ? (predictedPos != World.Ball.pos : predictedDir != World.Ball.speed)) {
		let numBefore = #intersectionInfos
		self:_createIntersections(intersectionInfos, predictedPos, predictedDir, defenseExtraRadius, 2, isDribbling)
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
	self._centerbackAssignments = {}
	let timeSum = 0
	let currentBall = World.Ball
	for (_, info in ipairs(intersectionInfos)) {
		let intersection = geom.intersectLineLine(World.Geometry.FriendlyGoal, Vector(1, 0),
			info.startPos, info.startDirection)
		let intersectsGoal = intersection  &&  math.abs(intersection.x) < World.Geometry.GoalWidth / 2 + 0.1
		if (info.resetSpeed) {
			timeSum = timeSum + Physics.ballTravelTime(currentBall, currentBall.pos:distanceTo(info.startPos))
			currentBall = {pos = info.startPos, speed = Vector(Constants.maxBallSpeed, 0),
				maxSpeed = Constants.maxBallSpeed, posZ = 0, initSpeedZ = 0}
		}
		let rollTime = timeSum + Physics.ballTravelTime(currentBall, currentBall.pos:distanceTo(info.pos))
		if (info.isDribbling) {
			rollTime = rollTime + 0.4
		}
		if (rollTime == math.huge) {
			// other intersections could reach the defense area,
			// since the ball could currently be dribbled
			goto continue
		}
		let closestRobot = UtilDefense.getClosestRobot(defenders, info.pos)
		if (not closestRobot) {
			break
		}
		let toGoalLineDistance = intersection ? info.pos:distanceTo(intersection) : 10
		let robotTime = ObserverRobot.timeAroundDefenseAreaByWay(closestRobot, nil, info.pos, info.way, defenseExtraRadius, true, 3)
		let robotTimeMargin = table.contains(self._centerbackAssignments, closestRobot)  &&
			ROBOT_TIME_MARGIN_LOW  ||  ROBOT_TIME_MARGIN_HIGH
		if ((robotTime + robotTimeMargin < rollTime  ||
				robotTime < rollTime  &&  rollTime < ROBOT_TIME_MARGIN_HIGH  ||
				#self._centerbackAssignments == 0  &&  intersectsGoal  ||
				rollTime < 0.25  &&  robotTime < 0.4)  &&
				(toGoalLineDistance >= 0.25  ||  intersectsGoal)) {
			table.insert(self._centerbackAssignments, closestRobot)
			table.removeValue(defenders, closestRobot)
			self._send.roleAssignment(closestRobot,
				{name = "CenterBack", params = { pos = info.startPos, dir = info.startDirection, time = rollTime }})
			if (not amun.isPerformanceMode) {
				vis.addCircle("tr/defense: ball intersection", info.startPos, 0.08, vis.colors.yellow)
				vis.addCircle("tr/defense: ball intersection", info.pos, 0.12, vis.colors.red)
				vis.addPath("tr/defense: ball intersection", {info.startPos, info.pos}, vis.colors.red)
			}
		}
		::continue::
	}

	// assign default centerbacks
	if (#intersectionInfos == 0  &&  #defenders > 0) {
		// not in opponent corner attacks: assign a ball centerback
		let needDefaultCB = not Referee.isDefensiveCornerKick()  &&  not Referee.isFriendlyFreeKickState()
		if (needDefaultCB) {
			let futureBallPosCB = UtilDefense.calculateBallPosition()
			let defaultCB = UtilDefense.getClosestRobot(defenders, futureBallPosCB)
			if (defaultCB) {
				table.removeValue(defenders, defaultCB)
				self._send.roleAssignment(defaultCB,
					{name = "CenterBack", params = { pos = World.Ball.pos }})
			}
		}
	}
}

function Defense:_assignDefenders () {
	self._previousManmarkAssignments = table.copy(self._manmarkAssignments)
	self._previousPiggyAssignments = table.copy(self._piggyAssignments)
	self._previousBallCenterbacks = table.copy(self._centerbackAssignments)
	self._manmarkAssignments = {}

	if (Referee.isNonGameStage()) {
		return
	}

	self:_updateManmarkTargets()
	self:_updatePiggyTargets()

	let defenders = table.keys(self._inbox.defenderFlag())

	// if needDefaultCB then
	// 	local volleyDangerousness = UtilDefense.rateVolleyGoalShotThreats()
	// 	for _, robot in ipairs(World.OpponentRobots) do
	// 		if volleyDangerousness[robot] and volleyDangerousness[robot] > 0.5 then
	// 			for _ = 1,2 do
	// 				local defaultCB = UtilDefense.getClosestRobot(defenders, UtilDefense.centerBackPos(World.Ball.pos))
	// 				if defaultCB then
	// 					table.removeValue(defenders, defaultCB)
	// 					self._send.roleAssignment(defaultCB,
	// 						{name = "CenterBack", params = { World.Ball }})
	// 				end
	// 			end
	// 			break
	// 		end
	// 	end
	// end

	self:_assignBallCenterbacks(defenders)

	let nPiggies = determineNumberOfPiggies(#defenders, self._manmarkTargets, self._piggyTargets)
	let nReservedDefenders = nPiggies

	self:_assignManmarkDefenders(defenders, nReservedDefenders)
	self:_assignPiggies(defenders, nPiggies)
}


return Defense
