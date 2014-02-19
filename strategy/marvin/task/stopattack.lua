local StopAttack = (require "../base/class").new("Task.StopAttack", require "task/base")

local Constants = require "../base/constants"
local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Goal = require "observer/goal"
local Rating = require "util/rating"
local Field = require "util/field"
local debug = require "../base/debug"
local RobotList = require "util/robotlist"

StopAttack.priority = 4

function StopAttack:_init()
	self._pos = nil
	self._dir = nil
	self.offensive = World.Ball.pos.y > 0
	self.lastLargestIntervalMid = 0
	self.lastLargestIntervalSize = 0
end

function StopAttack:run()
	--hysteresis for offensive switch
	if World.Ball.pos.y > 0.2 then
		self.offensive = true
	elseif World.Ball.pos.y < -0.2 then
		self.offensive = false
	end
	debug.set("OffensiveStop", self.offensive)
	
	--offensive: aim torwards enemy goal, else place in front of own goal
	local largestInterval = nil
	if self.offensive then
		largestInterval = Goal.largestFreeSector(World.Ball.pos, World.OpponentRobots, true)
		if largestInterval == nil then --middle of goal as fallback
			largestInterval = {(World.Geometry.OpponentGoal - World.Ball.pos):angle(), (World.Geometry.OpponentGoal - World.Ball.pos):angle()}
		end

		--Hysterese
		local largestIntervalSize = largestInterval[2] - largestInterval[1]
		local freeSectors = Goal.freeSectors(World.Ball.pos, World.OpponentRobots, true)
		for _, sector in pairs(freeSectors) do
			if sector[1] - math.pi <= self.lastLargestIntervalMid and sector[2] - math.pi >= self.lastLargestIntervalMid and self.lastLargestIntervalSize > largestIntervalSize - 2 then --2 is magic constant
				largestInterval = sector
				break
			end
		end
		self.lastLargestIntervalSize = largestInterval[2]-largestInterval[1]
		
		largestInterval[1] = largestInterval[1] - math.pi
		largestInterval[2] = largestInterval[2] - math.pi
	else

		largestInterval = Goal.largestFreeSector(World.Ball.pos, RobotList.excludeRobot(World.FriendlyRobots, self._robot), false)
		if largestInterval == nil then --middle of goal as fallback
			largestInterval = {(World.Geometry.FriendlyGoal - World.Ball.pos):angle(), (World.Geometry.OpponentGoal - World.Ball.pos):angle()}
		end
		
		--Hysterese
		local largestIntervalSize = largestInterval[2] - largestInterval[1]
		local freeSectors = Goal.freeSectors(World.Ball.pos, RobotList.excludeRobot(World.FriendlyRobots, self._robot), false)
		for _, sector in pairs(freeSectors) do
			if sector[1] <= self.lastLargestIntervalMid and sector[2] >= self.lastLargestIntervalMid and self.lastLargestIntervalSize > largestIntervalSize - 2 then --2 is magic constant
				largestInterval = sector
				break
			end
		end
		self.lastLargestIntervalSize = largestInterval[2]-largestInterval[1]
	end
	
	local targetAngle = (largestInterval[1] + largestInterval[2]) / 2
	self.lastLargestIntervalMid = targetAngle
	local minDist = World.Ball.radius + self._robot.radius + Constants.stopBallDistance + Settings.positionPadding
	
	local target = World.Ball.pos + Vector.fromAngle(targetAngle) * minDist
	
	-- stop attacker moving out to the left / right 
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

	-- stop attacker moving out to the left / right 
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

	-- check if ball is in corner (if true, move towards goal) 
	if target.y > World.Geometry.FieldHeightHalf then 
		target.y = World.Geometry.FieldHeightHalf
		if target.x > 0 then 
			target.x = World.Ball.pos.x - minDist
		else
			target.x = World.Ball.pos.x + minDist
		end 
	end 
	if target.y < -World.Geometry.FieldHeightHalf then 
		target.y = -World.Geometry.FieldHeightHalf
		if target.x > 0 then 
			target.x = World.Ball.pos.x - minDist
		else
			target.x = World.Ball.pos.x + minDist
		end 
	end 

	self._pos = target
	self._pos = Field.limitToAllowedField(self._pos, 0.03, true)
	self._dir = (World.Ball.pos - self._pos):angle()
	
	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)
	
	self._robot.trajectory:update(ToTarget, self._pos, self._dir)
end

return StopAttack
