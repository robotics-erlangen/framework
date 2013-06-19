local StopAttack = (require "../base/class").new("Task.StopAttack", require "task/base")

local Constants = require "../base/constants"
local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Goal = require "observer/goal"
local Rating = require "util/rating"


StopAttack.priority = 4

function StopAttack:_init()
	self._pos = nil
	self._dir = nil
end

function StopAttack:_rate()
	-- scan for a free sector in our own half
	local freeSectors = Goal.getFreeSectors(World.Ball.pos, World.OpponentRobots, -math.pi, 0)

	local ballAngle = (self._robot.pos - World.Ball.pos):angle()

	local largestInterval = nil
	local valueLargest = -1 -- size of the largest interval
	for _, interval in ipairs(freeSectors) do	-- find the largest interval
		local diff = interval[2] - interval[1]
		if interval[1] <= ballAngle and ballAngle <= interval[2] then
			diff = diff * 1.1 -- hysteresis
		end
		if diff > valueLargest then
			largestInterval = interval
			valueLargest = diff
		end
	end

	-- defend goal as fallback
	local targetAngle = largestInterval and (largestInterval[1] + largestInterval[2]) / 2 
			or (World.Geometry.FriendlyGoal - World.Ball.pos):angle()

	local minDist = World.Ball.radius + self._robot.radius + Constants.stopBallDistance + Settings.positionPadding
	local target = World.Ball.pos + Vector.fromAngle(targetAngle) * minDist

	
	limitYPos(target, minDist)
	local changedX = false
	if target.x > World.Geometry.FieldWidthHalf then 
		target.x = World.Geometry.FieldWidthHalf
		changedX = true
	end 
	
	if target.x < -World.Geometry.FieldWidthHalf then 
		target.x = -World.Geometry.FieldWidthHalf
		changedX = true
	end 
	if changedX then 
		if target.y - World.Ball.pos.y > 0 then 
			target.y = World.Ball.pos.y + minDist
		else 
			target.y = World.Ball.pos.y - minDist
		end 
	end 
	limitYPos(target, minDist)
	 


	self._pos = target
	self._dir = (World.Ball.pos - self._pos):angle()

	return Rating.posToRating(self._robot, self._pos)
end


function limitYPos(target, minDist)
	local changedY = false
	if target.y > World.Geometry.FieldHeightHalf then 
		target.y = World.Geometry.FieldHeightHalf
		changedY = true
	end 
	
	if target.y < -World.Geometry.FieldHeightHalf then 
		target.y = -World.Geometry.FieldHeightHalf
		changedY = true
	end 
	if changedY then 
		if target.x - World.Ball.pos.x > 0 then 
			target.x = target.x + minDist
		else 
			target.x = target.x - minDist
		end 
	end 
end 





function StopAttack:_run()
	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)
	
	self._robot.trajectory:update(ToTarget, self._pos, self._dir)
end

function StopAttack.factory(position)
	local f = function (robots)
		return StopAttack.create(robots[position])
	end
	return f
end

function StopAttack.test(id)
	if id > 0 then
		return nil
	end
	return StopAttack.factory(1), 1
end

return StopAttack
