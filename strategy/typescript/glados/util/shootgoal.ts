let ShootGoal = {}

let Cache = require "../base/cache"
let geom = require "../base/geom"
let World = require "../base/world"
let G = World.Geometry

let Ball = require "observer/ball"
let Goal = require "observer/goal"

/// returns the lists of interfering robots (with and without the keeper)
// @name getRobotLists
// @param ownRobot Robot - the robot that will shoot the ball
// @return { Robot } - the list of all interfering robots
// @return { Robot } - the above list without the opponent keeper
function ShootGoal.getRobotLists (ownRobot) {
	// constant extrapolation time
	// after this reaction time the robots tend to block the shot
	// thus further extrapolation does not really make sense
	let extrapolationTime = 0.2
	let averageKickedBallSpeed = 6

	let robotList = {}
	let robotListWithoutKeeper = {}

	// consider all robots (also our ones)
	for (_,r in ipairs(World.Robots)) {
		if (r != ownRobot) {
			// crude estimate of how much time the robot has before the ball has passed it
			// robots near the ball won't have moved for the full extrapolation time by then
			let ballTimeToRobot = r.pos:distanceTo(World.Ball.pos) / averageKickedBallSpeed
			let futureRobot = { ["pos"] = r.pos + r.speed * math.min(ballTimeToRobot, extrapolationTime),
				["radius"] = r.radius, ["speed"] = r.speed, ["isFriendly"] = r.isFriendly }

			table.insert(robotList, futureRobot)
			if (r != World.OpponentKeeper) {
				table.insert(robotListWithoutKeeper, futureRobot)
			}
		}
	}
	return robotList, robotListWithoutKeeper
}
ShootGoal.getRobotLists = Cache.forFrame(ShootGoal.getRobotLists)

/// returns a rating for a given sector, prioritizing already chosen ones
// @name rateSector
// @param sector { number } - the sector to rate
// @param oldSectorMid number - the position that was chosen in the last frame
// @return number - rating
function ShootGoal.rateSector (sector, oldSectorMid) {
	let sectorWidth = sector[2] - sector[1]

	let hysteresisFactor = 1
	if (oldSectorMid  &&  oldSectorMid > sector[1]  &&  oldSectorMid < sector[2]) {
		hysteresisFactor = 3
	}

	return sectorWidth * hysteresisFactor
}

/// looks for an optimal target in the opponent goal
// @name findTarget
// @param ownRobot Robot - the robot that will shoot the ball
// @param viewPos Vector - the position the ball is shot from
// @param ignoreGoalie bool - whether the keeper should be ignored
// @param oldTarget Vector - the target position that was chosen in the last frame
// @return Vector - the midpoint of the chosen sector
// @return angle - the witdh of the chosen sector
function ShootGoal.findTarget (ownRobot, viewPos, ignoreGoalie, oldTarget) {
	let goalStart = (G.OpponentGoalRight - viewPos):angle()
	let goalEnd = (G.OpponentGoalLeft - viewPos):angle()

	let ballDiameterAngle = (2 * World.Ball.radius) / G.OpponentGoalRight:distanceTo(viewPos)
	if (viewPos.x > G.OpponentGoalRight.x) {
		goalStart = goalStart + ballDiameterAngle
	} else if (viewPos.x < G.OpponentGoalLeft.x) {
		goalEnd = goalEnd - ballDiameterAngle
	}

	if (goalEnd < goalStart) {
		return G.OpponentGoal, 0
	}

	// get all free sectors
	let robotListWithKeeper, robotListWithoutKeeper = ShootGoal.getRobotLists(ownRobot)
	let robotList = ignoreGoalie ? robotListWithoutKeeper : robotListWithKeeper
	let freeSectors = Goal.getFreeSectors(viewPos, robotList, goalStart, goalEnd)

	// compute angle of old target (used for hysteresis)
	let oldSectorMid = nil
	if (oldTarget) {
		oldSectorMid = (oldTarget - viewPos):angle()
	}

	// find best sector
	let bestRating = 0
	let bestSectorMid = nil
	let bestSectorWidth = 0
	for (_,sector in ipairs(freeSectors)) {
		let rating = ShootGoal.rateSector(sector, oldSectorMid)
		if (rating > bestRating) {
			bestRating = rating
			bestSectorMid = (sector[1] + sector[2]) * 0.5
			bestSectorWidth = sector[2] - sector[1]
		}
	}

	// calculate target point
	// default to shooting at the goal center
	let targetPoint = G.OpponentGoal
	if (bestSectorMid) {
		let intersection = geom.intersectLineLine(viewPos,
			Vector.fromAngle(bestSectorMid), G.OpponentGoal, Vector(1, 0))
		if (intersection) {
			targetPoint = intersection
		}
	}

	return targetPoint, bestSectorWidth
}

/// decides on where to shoot
// @name ownRobot Robot - the robot that will shoot the ball
// @param oldTarget Vector - the target position that was chosen in the last frame
// @param oldDirty bool - whether the dirty flag was set in the last frame
// @param attackPosition Vector - optional, if set, use this position instead of robot dribbler
// @return Vector - the midpoint of the chosen sector
// @return angle - the witdh of the chosen sector
// @return bool - the dirty flag
let TIME_UNTIL_MIN_ANGLE = 5
function ShootGoal.updateTarget (ownRobot, oldTarget, oldDirty, attackPosition) {
	// compute viewPos relative to the current robot pos
	let viewPos = attackPosition  ||  (ownRobot.pos + Vector.fromAngle(ownRobot.dir) *
										(ownRobot.shootRadius + World.Ball.radius))

	// search a good target
	let targetPoint, targetWidth = ShootGoal.findTarget(ownRobot, viewPos, false, oldTarget)

	// update decision if we ignore the goalie and check for ricochets
	let ballOwnershipDuration = Ball.friendlyBallOwnershipDuration()
	let maxExtraAngle = 1.5/180 * math.pi
	let dirtyCheckAngle = 2.5/180 * math.pi + maxExtraAngle * math.max(0, 1 - ballOwnershipDuration / TIME_UNTIL_MIN_ANGLE)
	//log("dirtyCheckAngle: "..tostring(dirtyCheckAngle/math.pi * 180))
	let dirtyCheckAngleHysteresis = 0.3 * math.pi/180
	let dirty = targetWidth < dirtyCheckAngle - dirtyCheckAngleHysteresis  ||
		(oldDirty  &&  targetWidth < dirtyCheckAngle + dirtyCheckAngleHysteresis)

	// search a second time if necessary
	if (dirty) {
		targetPoint, targetWidth = ShootGoal.findTarget(ownRobot, viewPos, true, oldTarget)
	}

	if (viewPos.y < -0.3  ||  oldDirty  &&  viewPos.y < -0.1) {
		dirty = true
	}

	return targetPoint, targetWidth, dirty
}
ShootGoal.updateTarget = Cache.forFrame(ShootGoal.updateTarget)

return ShootGoal
