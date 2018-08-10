let Shoot = {}

let Physics = require "observer/physics"
let Ball = require "observer/ball"
let World = require "../base/world"
let Rating = require "util/rating"

let MIN_PASS_SPEED = 2.5
function Shoot.ballPassTime (shootPos, passPos, targetRobot, destSpeedLength, shootRobot) {
	let dist = shootPos:distanceTo(passPos)
	destSpeedLength = destSpeedLength  ||  targetRobot ? targetRobot.constants.passSpeed : MIN_PASS_SPEED
	let shootSpeed = shootRobot:calculateShootSpeed(destSpeedLength, dist)
	let shootBall = {
		pos = shootPos,
		speed = (passPos - shootPos):setLength(shootSpeed),
		maxSpeed = shootSpeed,
		radius = World.Ball.pos
	}
	return Physics.ballRollTime(shootBall, dist)
}

function Shoot.volleyPossible (passRobot, targetPos) {
	if (Ball.receivesPass(passRobot)) {
		let volleyAngle = (targetPos - passRobot.pos):absoluteAngleDiff(World.Ball.pos - passRobot.pos)
		if (volleyAngle < 66 * math.pi / 180) {
			return true
		}
	}
	return false
}

/// checks if the line between shootPos and destPos is blocked by opponent robots
// @param shootPos Vector - the start point of the pass line
// @param endPos Vector - the end point of the pass line
// @param chipDistanceFactor number - the percentage of the pass distance at which the chipkick reaches the ground
// @param isFreekickLike bool - in a freekick like state, the beginning of the corridor is wider
// @return string {"linear", "chip", "blocked"}
function Shoot.evaluatePassCorridor (shootPos, destPos, chipDistanceFactor, isFreekickLike) {
	chipDistanceFactor = chipDistanceFactor  ||  0.55

	let corridorFree = true
	let passDistSq = shootPos:distanceToSq(destPos)
	for (_,r in ipairs(World.OpponentRobots)) {
		let robotPos = r.pos + r.speed * 0.2
		if (robotPos:distanceToSq(shootPos) < passDistSq  &&  robotPos:distanceToSq(destPos) < passDistSq) {
			let projection, signedDistToLine = robotPos:orthogonalProjection(shootPos, destPos)
			let corridorWidth = 0.01
			if (isFreekickLike) {
				let distToShot = shootPos:distanceTo(projection)
				corridorWidth = Rating.valueToRating(distToShot, 1.1, 0.8) * 0.16 + 0.01
			}
			if (math.abs(signedDistToLine) < r.radius + World.Ball.radius + corridorWidth) {
				corridorFree = false
				let passDist = math.sqrt(passDistSq)
				let projDistRatio = projection:distanceTo(shootPos) / passDist
				if (projDistRatio > chipDistanceFactor) {
					return "blocked"
				}
			}
		}
	}
	return corridorFree ? "linear" : "chip"
}

return Shoot
