--[[***********************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
*************************************************************************]]

local Shoot = {}

local Physics = require "observer/physics"
local Ball = require "observer/ball"
local World = require "../base/world"
local Rating = require "util/rating"

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
-- @param isFreekickLike bool - in a freekick like state, the beginning of the corridor is wider
-- @return string {"linear", "chip", "blocked"}
function Shoot.evaluatePassCorridor(shootPos, destPos, chipDistanceFactor, isFreekickLike)
	chipDistanceFactor = chipDistanceFactor or 0.55

	local corridorFree = true
	local passDistSq = shootPos:distanceToSq(destPos)
	for _,r in ipairs(World.OpponentRobots) do
		local robotPos = r.pos + r.speed * 0.2
		if robotPos:distanceToSq(shootPos) < passDistSq and robotPos:distanceToSq(destPos) < passDistSq then
			local projection, signedDistToLine = robotPos:orthogonalProjection(shootPos, destPos)
			local corridorWidth = 0.01
			if isFreekickLike then
				local distToShot = shootPos:distanceTo(projection)
				corridorWidth = Rating.valueToRating(distToShot, 1.1, 0.8) * 0.16 + 0.01
			end
			if math.abs(signedDistToLine) < r.radius + World.Ball.radius + corridorWidth then
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
