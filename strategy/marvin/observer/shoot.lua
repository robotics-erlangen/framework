local Shoot = {}

local Physics = require "observer/physics"
local Ball = require "observer/ball"
local World = require "../base/world"

function Shoot.ballPassTime(shootPos, passPos, targetRobot, destSpeedLength)
	local dist = shootPos:distanceTo(passPos)
	destSpeedLength = destSpeedLength or targetRobot.constants.passSpeed
	local shootSpeed = targetRobot:calculateShootSpeed(destSpeedLength, dist)
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
		if volleyAngle < 60 * math.pi / 180 then
			return true
		end
	end
	return false
end

return Shoot
