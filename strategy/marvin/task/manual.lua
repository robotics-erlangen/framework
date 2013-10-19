local ShootGoal = require "task/shootgoal"
local Manual = (require "../base/class").new("Task.Manual", ShootGoal)

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
	local ratings = self._inbox.assistantRating()
	
	-- only search for pass targets until we found one
	if not self._bestPassTarget then
		local bestRobot, bestAngle = nil, math.pi
		for _,r in pairs(World.FriendlyRobots) do
			local angleDiff = math.abs((r.pos - World.Ball.pos):angle() - self._robot.dir)
			if ratings[r] and angleDiff < 20 /180*math.pi and angleDiff < bestAngle then
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

function Manual:run()
	local input = self._robot.userControl

	-- if the user wants to shoot, let him
	if input.kickPower > 0 and Ball.friendlyBallOwner() == self._robot then
		if input.kickStyle == "Linear"  then
			self:_intelligentShoot()
		else
			self:_shoot(self._robot.pos + Vector.fromAngle(self._robot.dir), math.huge, false)
		end
		return
	end

	-- reset pass target finding
	self._bestPassTarget = nil

	-- just do what the user wants the robot to do
	self._robot.trajectory:update(Direct, input.speed, nil, input.omega)
end

return Manual
