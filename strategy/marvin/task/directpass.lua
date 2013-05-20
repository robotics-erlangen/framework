local DirectPass = (require "../base/class").new("Task.DirectPass", require "task/shoot")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Settings = require "settings"
local Shoot = require "observer/shoot"
local Robot = require "observer/robot"
local Rating = require "util/rating"


DirectPass.priority = 4

function DirectPass:_init(targetRobot, linearShoot)
	self._targetRobot = targetRobot
	self._linearShoot = linearShoot
end

function DirectPass:_successProbability(t)
	-- TODO code only works if the ball and robot are not moving 
	local shootChance

	local startPos = self._robot.pos

	-- get estimated pos of impact = where the ball will go 
	local estimatedPos = startPos + Vector.fromAngle(self._robot.dir) * (startPos:distanceTo(self._targetPos))
	-- get distance to where it is supposed to go
	local distanceToTarget = estimatedPos:distanceTo(self._targetPos) 

	local dribblerWidth = self._targetRobot.dribblerWidth
	-- if robot is going to hit the dribbler, all good 
	if (distanceToTarget < dribblerWidth / 2) then
		shootChance = 1
	elseif (distanceToTarget < dribblerWidth) then 
		-- TODO test if the values actuall work and aren't too restrictive / leniate 
		shootChance  = math.exp(dribblerWidth / 2 - distanceToTarget)
	else 
		-- no way of catching the ball (more than dribblerWidth / 2 of course) 
		return 0 
	end 


	--TODO check if other position would be more efficient
	-- returns the minimum of shootChance and the following 
	local evalRet
	-- check for opponents in the pass corridor
	if self._linearShoot then
		--check posibility of success at time t for linear shoot
		evalRet = Shoot.evaluatePassCorridor(self._targetRobot, t, self._targetPos)
	else
		--check posibility of success at time t for chip
		evalRet = Shoot.evaluateChipCorridor(self._targetRobot, t, self._targetPos)
	end
	return math.min(evalRet, shootChance)
end

function DirectPass:_run(priorityMessages, notifications)
	local msg = notifications[self._targetRobot]

	self._targetPos = msg and msg.task.targetPos or self._targetRobot.pos
	self._targetDir = msg and msg.task.targetDir or self._targetRobot.dir

	-- shoot ball into robot dribbler
	self._targetPos = self._targetPos + Vector.fromAngle(self._targetDir) * self._targetRobot.shootRadius
	-- TODO calc shoot target

	local passSpeed = self._targetRobot.constants.passSpeed
	self:_shoot(self._targetPos, passSpeed, self._linearShoot, Settings.shootProbabilityThreshold)
end

function DirectPass:_rate()
	return Rating.timeToRating(Robot.minTimeToBall(self._robot, World.Ball))
end

function DirectPass.factory(position, positionTarget, linearShoot)
	local f = function (robots)
		return DirectPass.create(robots[position], robots[positionTarget], linearShoot)
	end
	return f
end

function DirectPass.test(id)
	if id > 0 then
		return nil
	end
	return DirectPass.factory(1, 2, true), 2
end

return DirectPass
