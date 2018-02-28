local Task = require "task/base"
local Shoot = require "task/ability/shoot"
local Manual = Class("Task.Manual", Task, Shoot)

local World = require "../base/world"
local Ball = require "observer/ball"
local Direct = require "trajectory/direct"
local Hidden = require "trajectory/hidden"
local PathHelper = require "trajectory/pathhelper"


function Manual:_limitRobotSpeed(v)
	local slowSpeed = 0.3
	local fastSpeed = 2
	local pos = self._robot.pos

	local a = 2 -- 1/a m is slow zone
	local kleft = math.bound(0, 1 - a*World.Geometry.FieldWidthHalf - a*pos.x, 1)
	local kright = math.bound(0, a*pos.x - a*World.Geometry.FieldWidthHalf + 1, 1)
	local kdown = math.bound(0, 1 - a*World.Geometry.FieldHeightHalf - a*pos.y, 1)
	local kup = math.bound(0, a*pos.y - a*World.Geometry.FieldHeightHalf + 1, 1)

	local khor = math.max(kleft, kright)
	local kver = math.max(kdown, kup)
	local k = math.max(khor, kver)

	local vmax = k * slowSpeed + (1-k) * fastSpeed

	local vlimited = v
	if v:length() > vmax then
		vlimited = v:copy():setLength(vmax)
	end
	return vlimited
end


local obstacleTable = {
	ignoreBall = true,
	ignoreDefenseArea = true,
	stopBallDistance = 0,
	ignoreOpponentDefenseArea = true,
	ignorePass = true
}
function Manual:run()
	PathHelper.setObstaclesByTable(self._robot.path, self._robot, obstacleTable)

	local input = self._robot.userControl

	if input.kickPower and input.kickPower > 0 and Ball.friendlyBallOwner() == self._robot then
		-- shoot
		local shootDistance = 1.5
		local shootPos = self._robot.pos + Vector.fromAngle(self._robot.dir):scaleLength(shootDistance)
		local linear = input.kickStyle == "Linear"
		if linear then
			self:_shoot(shootPos, math.huge)
		else
			self:_chipToPos(shootPos)
		end
	elseif not self._robot.isVisible then
		local limitedSpeed = input.speed
		if limitedSpeed:length() > 0.3 then
			limitedSpeed = limitedSpeed:copy():setLength(0.3)
		end
		local omegamax = math.pi/2
		local omega = math.bound(-omegamax, input.omega, omegamax)
		self._robot.trajectory:update(Hidden, limitedSpeed.y, limitedSpeed.x, omega)
	else
		-- don't let the robots crash
		local limitedSpeed = self:_limitRobotSpeed(input.speed)
		self._robot.trajectory:update(Direct, limitedSpeed, nil, input.omega)
	end

	-- play attacker
	self._send.attackerFlag("all")
end

return Manual
