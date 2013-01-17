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
	-- FIXME check that robot is oriented towards the target

	--TODO check if other position would be more efficient
	if self._linearShoot then
		return Shoot.evaluatePassCorridor(self._targetRobot, t)	--check posibility of success at time t for linear shoot
	else
		return Shoot.evaluateChipCorridor(self._targetRobot, t)	--check posibility of success at time t for chip
	end
end

function DirectPass:_run(priorityMessages, notifications)
	local msg = notifications[self._targetRobot]

	local targetPos = msg and msg.targetPos or self._targetRobot.pos
	local targetDir = msg and msg.targetDir or self._targetRobot.dir

	-- TODO calc shoot target
	-- TODO get pass speed

	-- check for obstacles

	local passSpeed = 1
	self:_shoot(targetPos, passSpeed, self._linearShoot, Settings.shootProbabilityThreshold)
end

local active = false
local inst1 = nil
local inst2 = nil
function DirectPass.test()
	local robot1 = World.FriendlyRobots[1]
	local robot2 = World.FriendlyRobots[2]
	if robot1 and robot2 then
		local MoveToPos = require "task/movetopos"
		local Field = require "util/field"
		if World.Ball.speed:length() > 0.7 and World.Ball.speed:absoluteAngleDiff(robot1.pos - World.Ball.pos) < 30/180*math.pi then
			if not active then
				inst1 = nil
			end
			active = true
		elseif not World.Ball:isPositionValid() or not Field.isInField(World.Ball.pos, 0) then
			active = false
			inst1 = nil
		end
		if active then
			inst1 = inst1 or DirectPass.create(robot1, robot2, true)
		else
			inst1 = inst1 or MoveToPos.create(robot1, Vector.create(-1, 2), 0)
		end
		inst2 = inst2 or MoveToPos.create(robot2, Vector.create(1, 2), math.pi)
		return inst1, inst2
	else
		inst1 = nil
		inst2 = nil
		active = false
	end
end

return DirectPass
