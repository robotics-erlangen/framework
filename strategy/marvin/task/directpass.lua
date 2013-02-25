local DirectPass = (require "../base/class").new("Task.DirectPass", require "task/shoot")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Settings = require "settings"
local Shoot = require "observer/shoot"


DirectPass.priority = 4

function DirectPass:_init(targetRobot, linearShoot)
	self._targetRobot = targetRobot
	self._linearShoot = linearShoot
end

function DirectPass:_successProbability(t)
	local shootchance

	local startPos = self._robot.pos
	local targetPos = self._targetRobot.pos

	-- get estimated pos of impact = where the ball will go 
	local estimatedPos = startPos + Vector.fromAngle(self._robot.dir) * (startPos:distanceTo(targetPos))
	-- get distance to where it is supposed to go
	local distanceToTarget = estimatedPos:distanceTo(targetPos) 

	local dribblerWidth = self._targetRobot.dribblerWidth
	-- if robot is going to hit the dribbler, all good 
	if (distanceToTarget < dribblerWidth / 2) then
		shootchance = 1
	elseif (distanceToTarget < dribblerWidth) then 
		-- TODO test if the values actuall work and aren't too restrictive / leniate 
		shootchance  = math.exp(dribblerWidth / 2 - distanceToTarget)
	else 
		-- no way of catching the ball (more than dribblerWidth / 2 of course) 
		return 0 
	end 


	--TODO check if other position would be more efficient
	-- returns the minimum of shootchance and the following 
	if self._linearShoot then
		--check posibility of success at time t for linear shoot
		return math.min(shootchance, passChance Shoot.evaluatePassCorridor(self._targetRobot, t)) 
	else
		--check posibility of success at time t for chip
		return math.min(passChance Shoot.evaluateChipCorridor(self._targetRobot, t))
	end
end

function DirectPass:_run(priorityMessages, notifications)
	local msg = notifications[self._targetRobot]

	local targetPos = msg and msg.targetPos or self._targetRobot.pos
	local targetDir = msg and msg.targetDir or self._targetRobot.dir

	-- shoot ball into robot dribbler
	targetPos = targetPos + Vector.fromAngle(targetDir) * self._targetRobot.shootRadius
	-- TODO calc shoot target
	-- TODO get pass speed

	-- check for obstacles

	local passSpeed = 2
	self:_shoot(targetPos, passSpeed, self._linearShoot, Settings.shootProbabilityThreshold)
end

local inst = nil
function DirectPass.test()
	local robot1 = World.FriendlyRobots[1]
	local robot2 = World.FriendlyRobots[2]
	if robot1 and robot2 then
		inst = inst or DirectPass.create(robot1, robot2, true)
		return inst
	else
		inst = nil
	end
end

return DirectPass
