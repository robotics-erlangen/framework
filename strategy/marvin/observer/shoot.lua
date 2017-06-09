local Shoot = {}

local Physics = require "observer/physics"
local Ball = require "observer/ball"
local World = require "../base/world"

local MIN_PASS_SPEED = 2.5
function Shoot.ballPassTime(shootPos, passPos, targetRobot, destSpeedLength, shootRobot)
	local dist = shootPos:distanceTo(passPos)
	destSpeedLength = destSpeedLength or targetRobot and targetRobot.constants.passSpeed or MIN_PASS_SPEED
	local shootSpeed = shootRobot:calculateShootSpeed(destSpeedLength, dist)
	local shootBall = {
		pos = shootPos,
		speed = (passPos - shootPos):setLength(shootSpeed),
		maxSpeed = shootSpeed,
		radius = World.Ball.pos
	}
	return Physics.ballRollTime(shootBall, dist)
end

function Shoot.volleyPossible(passRobot, targetPos)
	if Ball.receivesPass(passRobot) then
		local volleyAngle = (targetPos - passRobot.pos):absoluteAngleDiff(World.Ball.pos - passRobot.pos)
		if volleyAngle < 66 * math.pi / 180 then
			return true
		end
	end
	return false
end

--- checks if the line between shootPos and destPos is blocked by opponent robots
-- @param shootPos Vector - the start point of the pass line
-- @param endPos Vector - the end point of the pass line
-- @param chipDistanceFactor number - the percentage of the pass distance at which the chipkick reaches the ground
-- @return string {"linear", "chip", "blocked"}
function Shoot.evaluatePassCorridor(shootPos, destPos, chipDistanceFactor)
	chipDistanceFactor = chipDistanceFactor or 0.55

	local corridorFree = true
	local passDistSq = shootPos:distanceToSq(destPos)
	for _,r in ipairs(World.OpponentRobots) do
		local robotPos = r.pos + r.speed * 0.2
		if robotPos:distanceToSq(shootPos) < passDistSq and robotPos:distanceToSq(destPos) < passDistSq then
			local projection, signedDistToLine = robotPos:orthogonalProjection(shootPos, destPos)
			if math.abs(signedDistToLine) < r.radius + World.Ball.radius then
				corridorFree = false
				local passDist = math.sqrt(passDistSq)
				local projDistRatio = projection:distanceTo(shootPos) / passDist
				if projDistRatio > chipDistanceFactor then
					return "blocked"
				end
			end
		end
	end
	return corridorFree and "linear" or "chip"
end

return Shoot
