local Shoot = {}

local Physics = require "observer/physics"

function Shoot.ballPassTime(ball, passPos, targetRobot, destSpeedLength)
	local dist = ball.pos:distanceTo(passPos)
	destSpeedLength = destSpeedLength or targetRobot.constants.passSpeed
	local shootSpeed = targetRobot:calculateShootSpeed(destSpeedLength, dist)
	local shootBall = {
		pos = ball.pos,
		speed = (passPos - ball.pos):setLength(shootSpeed),
		maxSpeed = shootSpeed,
		radius = ball.radius
	}
	return Physics.ballRollTime(shootBall, dist)
end

return Shoot
