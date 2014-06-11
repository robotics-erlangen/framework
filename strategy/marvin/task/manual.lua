local ShootGoal = require "task/shootgoal"
local Manual = (require "../base/class").newTask("Task.Manual", ShootGoal)

local Constants = require "../base/constants"
local World = require "../base/world"
local Robot = require "observer/robot"
local Ball = require "observer/ball"
local Direct = require "trajectory/direct"

Manual.priority = 1

function Manual:_init()
end

function Manual:_canShoot()
	if self._targetGoal then
		return ShootGoal._canShoot(self)
	end
	return true
end

function Manual:_decideTargetGoal()
	local angleHyst = 30 /180*math.pi

	local toLeftGoal = World.Geometry.OpponentGoalLeft - World.Ball.pos
	local toRightGoal = World.Geometry.OpponentGoalRight - World.Ball.pos
	if not self._targetGoal and self._robot.dir > toRightGoal:angle() and self._robot.dir < toLeftGoal:angle() then
		self._targetGoal = true
	elseif self._targetGoal and (self._robot.dir + angleHyst < toRightGoal:angle()
			or self._robot.dir - angleHyst > toLeftGoal:angle()) then
		self._targetGoal = false
	end
end

function Manual:_findBestPassTarget()
	local assistants = self._inbox.attackerFlag("ignorePriority")

	-- only search for pass targets until we found one
	if not self._bestPassTarget then
		local bestRobot, bestAngle = nil, math.pi
		for r, _ in pairs(assistants) do
			local angleDiff = math.abs((r.pos - World.Ball.pos):angle() - self._robot.dir)
			if angleDiff < 20 /180*math.pi and angleDiff < bestAngle then
				bestRobot = r
				bestAngle = angleDiff
			end
		end
		self._bestPassTarget = bestRobot
	end
end

function Manual:_intelligentShoot()
	self:_decideTargetGoal()
	self:_findBestPassTarget()


	if self._targetGoal then
		ShootGoal.run(self)
	elseif self._bestPassTarget then
		local passSpeed = self._bestPassTarget.constants.passSpeed
		self:_shoot(self._bestPassTarget.pos, passSpeed, true)
		self._send(self._bestPassTarget).passSender("direct")
	else
		self:_shoot(self._robot.pos + Vector.fromAngle(self._robot.dir), math.huge, true)
	end
end

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

	local v2 = {x=0, y=0}
	v2.x = math.bound(-vmax, v.x, vmax)
	v2.y = math.bound(-vmax, v.y, vmax)
	return v2
end



function Manual:run()
	local input = self._robot.userControl

	-- if the user wants to shoot, let him
	if input.kickPower and input.kickPower > 0 and Ball.friendlyBallOwner() == self._robot then
		if input.kickStyle == "Linear"  then
			self:_intelligentShoot()
		else
			self:_shoot(self._robot.pos + Vector.fromAngle(self._robot.dir), math.huge, false)
		end
		return
	end

	-- reset pass target finding
	self._bestPassTarget = nil

	-- don't let the robots crash
	local limitedSpeed = self:_limitRobotSpeed(input.speed)
	self._robot.trajectory:update(Direct, limitedSpeed, nil, input.omega)

	-- play attacker
	self._send("all").attackerFlag()
end

return Manual
