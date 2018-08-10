let Goal = {}

let Cache = require "../base/cache"
let Constants = require "../base/constants"
let Field = require "../base/field"
let geom = require "../base/geom"
let vis = require "../base/vis"
let World = require "../base/world"

let Ball = require "observer/ball"
let Physics = require "observer/physics"
let Volley = require "task/ability/volley"
let Interval = require "util/interval"
let Rating = require "util/rating"


let G = World.Geometry

/// returns a list of all non-free sectors
// the non-free sectors are not merged and not sorted
// the interval has to be oriented counter-clockwise
// @param viewPos vector - usually Ball.pos
// @param robotList list - all robots that may block the sight
// @param startAngle number - start angle of the sector to scan
// @param endAngle number - end angle of the sector to scan
// @param insertRobots - set to true iff you want the robots included in its sector
// @return occupiedSectors list - all unsorted, unmerged occupied sectors
function Goal.getOccupiedSectors (viewPos, robotList, startAngle, endAngle, insertRobots) {
	if (endAngle < startAngle) { // normalize angles
		endAngle = endAngle + 2 * math.pi
	}

	let occupiedSectors = {}
	let extraRadius = World.Ball.radius
	for (_, robot in pairs(robotList)) {
		let toRobot = robot.pos - viewPos // vector from viewPos to center of robot
		let robotAngleDiff
		if (robot.radius + extraRadius <= toRobot:length()) {
			robotAngleDiff = math.asin((robot.radius + extraRadius) / toRobot:length()) // min angle between toRobot and shoot sector
		} else {
			robotAngleDiff = math.pi/2 // 90 deg, if the ball touches the robot (asin[-1,1]!)
		}
		let robotAngle = toRobot:angle() // direction of the robot
		let robotStart = robotAngle - robotAngleDiff // can be < 0
		let robotEnd = robotAngle + robotAngleDiff // can be > 2pi
		if (robotStart < endAngle  &&  robotEnd > startAngle) { // if the robot covers a part of the goal
			let resultTable = {math.max(robotStart, startAngle), math.min(robotEnd, endAngle)}
			if (insertRobots) {
				resultTable[3] = {robot, robot}
			}
			table.insert(occupiedSectors, resultTable) // add the occupied sector to the list
		}
		if (robotStart + 2 * math.pi < endAngle) { // normalize angles
			// checking for robotEnd + 2*pi > startAngle is not needed, as robotEnd is always >= 0 and startAngle < 2pi
			// and thus is always true
			robotStart = robotStart + 2 * math.pi
			robotEnd = robotEnd + 2 * math.pi
			let resultTable = {math.max(robotStart, startAngle), math.min(robotEnd, endAngle)}
			if (insertRobots) {
				resultTable[3] = {robot, robot}
			}
			table.insert(occupiedSectors, resultTable) // add the occupied sector to the list
		}
	}
	return occupiedSectors
}

function Goal.getFreeSectors (viewPos, robotList, startAngle, endAngle) {
	if (endAngle < startAngle) { // normalize angles
		endAngle = endAngle + 2 * math.pi
	}
	let occupiedSectors = Goal.getOccupiedSectors(viewPos, robotList, startAngle, endAngle)
	Interval.sort(occupiedSectors) // sort sectors ascending by sectorStart
	Interval.merge(occupiedSectors) // merge the sectors
	return Interval.negate(occupiedSectors, startAngle, endAngle)
}

/// Returns a list of all free sectors
// @param viewPos vector - position from which the free angles should be found
// @param robotList list - all robot objects that should be considered
// @param opp boolean - true for opponent goal, false for friendly goal
// @return list - list of free sectors [startAngle, endAngle] ascending by start angle
function Goal.freeSectors (viewPos, robotList, opp) {
	if ((opp ? 1 : -1)*viewPos.y > G.FieldHeightHalf) {
		//log("viewPos is behind the goal.")
		return {}
	}

	let goalStart = ((opp ? G.OpponentGoalRight : G.FriendlyGoalLeft) - viewPos):angle() // direction of the first goalpost
	let goalEnd = ((opp ? G.OpponentGoalLeft : G.FriendlyGoalRight) - viewPos):angle() // direction of the other goalpost (is always greater than goalStart, if viewPos is in the field)

	let unoccupiedSectors = Goal.getFreeSectors(viewPos, robotList, goalStart, goalEnd)
	//log(tostring(goalEnd - goalStart))
	// returns all unoccupied sectors in the interval [right goalpost, left goalpost]
	return unoccupiedSectors
}

/// Returns the largest free sector and its width (angle difference)
// @param viewPos vector - position from which the free angles should be found
// @param robotList list - all robot objects that should be considered
// @param opp boolean - true for opponent goal, false for friendly goal
// @return largestFreeSector interval - the largest free sector
function Goal.largestFreeSector (viewPos, robotList, opp) {
	let unoccupiedSectors = Goal.freeSectors(viewPos, robotList, opp) // get list of all unoccupied sectors
	return Interval.getLargest(unoccupiedSectors)
}

/// Returns a list of all sectors not covered by any robot from robotList (not limited to the goal)
// @param viewPos vector - position from which the free angles should be found
// @param robotList list - all robot objects that should be considered
function Goal.allFreeSectors (viewPos, robotList) {
	let occupiedSectors = Goal.getOccupiedSectors(viewPos, robotList, 0, 2*math.pi)
	//for i,sector in ipairs(occupiedSectors) do
	//	debug.set("osectors["..i.."]", "{"..sector[1]..", "..sector[2].."}")
	//end
	let matching = nil
	let delete = {}
	for (i,sector in ipairs(occupiedSectors)) {
		if (sector[1] == 0) {
			if (matching) {
				occupiedSectors[matching] = {occupiedSectors[matching][1], sector[2] + 2*math.pi}
				//debug.set("match "..matching.." & "..i, "{"..occupiedSectors[matching][1]..", "..occupiedSectors[matching][2].."}")
				matching = nil
				table.insert(delete, i)
			} else {
				matching = i
				//debug.set("match "..i, "start")
				//log("start")
			}
		} else if (sector[2] == 2*math.pi) {
			if (matching) {
				occupiedSectors[matching] = {sector[1], occupiedSectors[matching][2] + 2*math.pi}
				//debug.set("match "..matching.." & "..i, "{"..occupiedSectors[matching][1]..", "..occupiedSectors[matching][2].."}")
				matching = nil
				table.insert(delete, i)
			} else {
				matching = i
				//debug.set("match "..i, "end")
				//log("end")
			}
		}
	}
	for (i = #delete,1,-1) {
		table.remove(occupiedSectors, delete[i])
	}
	Interval.sort(occupiedSectors)
	//for i,sector in ipairs(occupiedSectors) do
	//	debug.set("O2sectors["..i.."]", "{"..sector[1]..", "..sector[2].."}")
	//end
	Interval.merge(occupiedSectors)
	//for i,sector in ipairs(occupiedSectors) do
	//	debug.set("MOsectors["..i.."]", "{"..sector[1]..", "..sector[2].."}")
	//end
	let freeSectors = Interval.negate(occupiedSectors, -42, 1337) // magic constants, don't change!
	if (#freeSectors > 2) {
		let first = freeSectors[1]
		let last = freeSectors[#freeSectors]
		//log(#freeSectors)
		//for i,sector in ipairs(freeSectors) do
		//	debug.set("Fsectors["..i.."]", "{"..sector[1]..", "..sector[2].."}")
		//end
		freeSectors[1] = {last[1], first[2]}
		table.remove(freeSectors)
	} else if (#freeSectors > 1) { // exactly 2 halfs (that are actually 1 sector, but with a sign flip)
		let first = freeSectors[1]
		let second = freeSectors[2]
		freeSectors = {{second[1], first[2]}}
		//for i,sector in ipairs(freeSectors) do
		//	debug.set("Fsectors["..i.."]", "{"..sector[1]..", "..sector[2].."}")
		//end
	} else {// no free sector
		freeSectors = {}
	}
	// remove sectors that are broader than 2pi
	for (i = #freeSectors,1,-1) {
		if (math.abs(freeSectors[i][2] - freeSectors[i][1]) > 2*math.pi) {
			table.remove(freeSectors, i)
		}
	}
	return freeSectors
}

let oldRobotPositions = {} // robot -> position
let lastRawdataBallPos = World.Ball.pos
let updateRobotPositions = function () {
	if (World.Ball.hasRawData) {
		lastRawdataBallPos = World.Ball.pos
		for (_, robot in ipairs(World.OpponentRobots)) {
			oldRobotPositions[robot] = robot.pos
		}
	}
}

let getInvisibleBallPrediction = function () {
	// basically invisible ball
	if (World.Ball.detectionQuality < 0.05) {
		// get the last tracked ball state

		// check if it is close to the defense area
		let MAX_DEFENSE_DIST = 2.5
		if (Field.distanceToFriendlyDefenseArea(lastRawdataBallPos, 0) > MAX_DEFENSE_DIST  &&
			Field.distanceToFriendlyDefenseArea(World.Ball.pos, 0) > MAX_DEFENSE_DIST) {
			return
		}

		// TODO: check for fast ball and save predictShot
		//if not Ball.isSlowBall() then
		//end

		// search for robots that were close at that point in time
		let closestRobot = nil
		let closestDistance = 0.5 // no robots farther away from the ball than that
		let closestDribblerPos, closestBallSpeed
		for (_, robot in ipairs(World.OpponentRobots)) {
			if (not oldRobotPositions[robot]) {
				break
			}
			let oldDistance = oldRobotPositions[robot]:distanceTo(lastRawdataBallPos)
			let newDistance = robot.pos:distanceTo(lastRawdataBallPos)
			if (oldDistance < closestDistance  ||  newDistance < closestDistance) {
				// it has to roughly point at the goal
				let robotDir = Vector.fromAngle(robot.dir)
				// as the robot might be dribbling the ball, use volley prediction
				// TODO: check if that is really a good idea! When using a relative speed of 0, volley calculations are useless.
				// This can be different in the future.
				// FIXME: volley for moving robots does not consider the friction of the carpet, because it is calculating everything
				// in robot coordinates
				// robot.speed as param for ballspeed is choosen, because that is the best estimate if there is no visible ball
				let dirx, diry = Volley.calcVOutTeamCoordinates(Constants.maxBallSpeed, robot.speed, robot.dir, robot.speed, "opp")
				let ballSpeed = Vector(dirx, diry)
				let dribblerPos = robot.pos + robotDir:copy():setLength(robot.shootRadius)
				let intersection = geom.intersectLineLine(G.FriendlyGoal, Vector(1, 0),
					dribblerPos, ballSpeed)
				if (intersection  &&  math.abs(intersection.x) < G.GoalWidth / 2 + 0.3) {
					closestDistance = math.min(oldDistance, newDistance)
					closestRobot = robot
					closestDribblerPos = dribblerPos
					closestBallSpeed = ballSpeed
				}
			}
		}

		if (not closestRobot) {
			return
		}
		return closestDribblerPos, closestBallSpeed, closestRobot
	}
}

/// Predicts the direction the ball will be shot into.
// Checks for ball movement, opponents near the ball, tries to predict passes
// @param allShots bool - whether or not to only count shots that can volley onto the goal and might hit the goal
// @return pos Vector - origin of movement
// @return dir Vector - ball movement direction and speed
// @return isShot bool - if the ball is fast (and should be considered as a threat)
// @return passReceivers list - list of all robots that could receive the pass
let BEST_ROBOT_HYSTERESIS = 1.1
let lastBestRobotId = nil
let comparePrediction = function (p1, p2) {
	if (p1.dist == p2.dist) {
		return p1.ballTime < p2.ballTime
	}
	return p1.dist > p2.dist
}
function Goal.predictShot (allShots) {
	// check for bad vision
	let invisibleBallPos, invisibleBallSpeed, oppRobot = getInvisibleBallPrediction()
	if (invisibleBallPos) {
		vis.addCircle("o/goal: predictShot: invisible ball", oppRobot.pos, oppRobot.radius, vis.colors.white, false)
			vis.addPath("o/goal: predictShot: invisible ball", {oppRobot.pos, oppRobot.pos + invisibleBallSpeed * 10}, vis.colors.white)
		return invisibleBallPos, invisibleBallSpeed, true, nil, true
	}

	let ballSpeed = World.Ball.speed:copy() // Defend ball by default
	let pos = World.Ball.pos
	let isShot = false
	let isDribbling = false
	let passReceivers = {}

	let oppBallOwner = Ball.opponentBallOwner()
	let oppBallDribbler = Ball.opponentBallDribbler()
	if (oppBallDribbler) {
		isShot = true
		isDribbling = true
<<<<<<< HEAD
		//NOTE: use World.Ball instead of futureBall is fine, as the shot is assumed to be imminent.
		let dirx, diry = Volley.calcVOutTeamCoordinates(Constants.maxBallSpeed, World.Ball.speed, oppBallDribbler.dir, oppBallDribbler.speed, "opp")
		ballSpeed = Vector(dirx, diry):normalize()
=======
		//NOTE: use World.Ball instead of futureBall is fine, as the shot is assumed to be imminent.
		let relativeSpeedLength = World.Ball.speed - oppBallDribbler.speed
		let dirx, diry = Volley.calcVOutFromVOutAbs(Constants.maxBallSpeed, relativeSpeedLength:length(), oppBallDribbler.dir, relativeSpeedLength:angle(), "opp")
		ballSpeed = (Vector(dirx, diry) + oppBallDribbler.speed):normalize()
>>>>>>> parent of 99e7ea7da... glados: change comment style from lua to typescript
		if (not allShots) {
			vis.addCircle("o/goal: predictShot: dribbling robot", oppBallDribbler.pos, oppBallDribbler.radius, vis.colors.blue, false)
			vis.addPath("o/goal: predictShot: dribbling robot", {oppBallDribbler.pos, oppBallDribbler.pos + ballSpeed * 10}, vis.colors.blue)
		}
	} else if (oppBallOwner  &&  Ball.isSlowBall()) {
		// if opponent is close to ball use its orientation
		ballSpeed = Vector.fromAngle(oppBallOwner.dir)
		isDribbling = true
	} else if (not Ball.isSlowBall()) {
		// FIXME as the ball is moving also use pass check if it slightly misses the goal
		// TODO check whether an opponent robot may deflect the ball inside the keeper area?
		// check if there's a robot which may recieve the pass

		// calculate the last point at which a volley with 75 degree angle is still possible
		let usedGoalPost = World.Geometry.FriendlyGoalLeft
		if (World.Ball.speed.x < 0) {
			usedGoalPost = World.Geometry.FriendlyGoalRight
		}
		let ballLineDistance = math.abs(usedGoalPost:orthogonalDistance(pos, pos + ballSpeed))
		let ballLinePos = usedGoalPost:orthogonalProjection(pos, pos + ballSpeed)
		let volleyPosDistance = ballLineDistance / math.tan(math.pi * 75 / 180)
		let ballSpeedCopy = ballSpeed:copy()
		let volleyPos = ballLinePos + ballSpeedCopy:setLength(volleyPosDistance)
		if (not allShots) {
			vis.addCircle("o/goal: predictShot: last volley pos", volleyPos, 0.1)
		}

		if (allShots  ||  Field.isInField(volleyPos, 0)) { // if a volley is possible
			let lengthOfBallMovement = 0.5 * ballSpeed:lengthSq() / (-Constants.ballDeceleration)
			let lineSegments = Field.allowedLineSegments(pos, ballSpeed, lengthOfBallMovement)
			if (not allShots) {
				for (_, line in ipairs(lineSegments)) {
					vis.addPath("o/goal: predictShot: allowed catch path", {line[1], line[2]}, vis.colors.cyan)
				}
			}

			for (_, robot in ipairs(World.OpponentRobots)) {
				let bestPointOnLine = World.Ball.pos
				let bestPointDistance = math.huge
				for (_, lineSegment in ipairs(lineSegments)) {
					let pointOnLine = robot.pos:nearestPosOnLine(lineSegment[1], lineSegment[2])
					let distance = robot.pos:distanceTo(pointOnLine)
					if (distance < bestPointDistance) {
						bestPointDistance = distance
						bestPointOnLine = pointOnLine
					}
				}
				if (not allShots  &&  math.sin(robot.dir) > 0) {
					goto continue
				}
				let ballRollTime = Physics.checkedBallRollTime(World.Ball, bestPointOnLine)
				let offsetLength = math.min(robot.shootRadius + World.Ball.radius, robot.pos:distanceTo(bestPointOnLine))
				let catchPos = bestPointOnLine + (robot.pos - bestPointOnLine):setLength(offsetLength)

				// calculate chance of the robot reaching catchPos before the ball
				let weightedDistance
				if (math.abs(ballRollTime) == math.huge) {
					weightedDistance = 0
				} else if (robot.pos:distanceTo(catchPos) < 0.1) {
					weightedDistance = 100000000 // very large number smaller than math.huge
				} else {
					let robotTime = Physics.robotTimeToPos(robot, catchPos, Vector(robot.maxSpeed, 0))
					weightedDistance = Rating.valueToRating(robotTime, ballRollTime, 0) * 1 / pos:distanceTo(catchPos)
				}
				if (robot.id == lastBestRobotId  &&  weightedDistance > 0) {
					weightedDistance = weightedDistance * BEST_ROBOT_HYSTERESIS
				}
				if ((robot.pos:distanceTo(World.Ball.pos)) < robot.shootRadius) {
					weightedDistance = math.huge
				}

				if (weightedDistance > 0) {
					table.insert(passReceivers, {robot = robot, dist = weightedDistance, ballTime = ballRollTime,
						catchPos = catchPos})
					if (not allShots) {
						vis.addPath("o/goal: predictShot: to catch position", {robot.pos, catchPos}, vis.colors.red)
					}
				}
::continue::
			}
			table.sort(passReceivers, comparePrediction)

			if (#passReceivers > 0) { // if there is a pass receiver, just block it
				let passReceiver = passReceivers[1]
				lastBestRobotId = passReceiver.id
				pos = passReceiver.catchPos
				let ballRollTime = Physics.ballRollTime(World.Ball, World.Ball.pos:distanceTo(pos))
				// assume that the opponent will try to stop for the volley and brake from now
				// TODO: Don't use 4 m/s*s as constant, at least not hidden like this
				let oppBrakeSpeed = math.max(0, passReceiver.robot.speed:length() - 4 * ballRollTime)
				let minRobotSpeed = passReceiver.robot.speed:copy():setLength(oppBrakeSpeed)
<<<<<<< HEAD
				let futureBallSpeed = Physics.ballAtTime(World.Ball, ballRollTime).speed
				// TODO: Check what happens if futureBallSpeed:length() is zero
=======
				let relativeSpeed = Physics.ballAtTime(World.Ball, ballRollTime).speed - minRobotSpeed
				// TODO: Hysteresis
				let ballAngle = relativeSpeed:length() > 0.5 ? relativeSpeed:angle() : World.Ball.speed:angle()
>>>>>>> parent of 99e7ea7da... glados: change comment style from lua to typescript
				let robotAngle = passReceiver.robot.dir
				let dirx, diry = Volley.calcVOutTeamCoordinates(Constants.maxBallSpeed, futureBallSpeed, robotAngle,
					minRobotSpeed, "opp")
				ballSpeed = Vector(dirx, diry):normalize()
				if (not allShots) {
					vis.addPath("o/goal: predictShot: receives pass", {passReceiver.robot.pos, pos}, vis.colors.pink)
					vis.addCircle("o/goal: predictShot: receives pass", pos, passReceiver.robot.radius, vis.colors.pink, false)
					vis.addPath("o/goal: predictShot: receives pass", {pos, pos + ballSpeed * 10}, vis.colors.pink)
				}
			}
		}
		isShot = true
	} else {
		// otherwise use center of directions to goal posts
		// FIXME: check
		let left = (World.Geometry.FriendlyGoalLeft - World.Ball.pos):normalize()
		let right = (World.Geometry.FriendlyGoalRight - World.Ball.pos):normalize()
		ballSpeed = left + right
	}

	return pos, ballSpeed, isShot, passReceivers, isDribbling
}
Goal.predictShot = Cache.forFrame(Goal.predictShot)

function Goal._update () {
	updateRobotPositions()
}


return Goal
