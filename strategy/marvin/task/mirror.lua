local Mirror = (require "../base/class").new("Task.Mirror", require "task/base")

local World = require "../base/world"
local Game = require "observer/game"
local ToTarget = require "trajectory/totarget"
local Field = require "util/field"

Mirror.priority = 1

--- init
--@param side bool - if its on the right side
--@param distanceToCenterLine number - how far the robot stays away from the center line
function Mirror:_init(side, distanceToCenterLine)
	self._side = side
	self._distance = distanceToCenterLine
	self._lastTargetRobot = nil
end

--- mirrors the opponent that is the closest one to our goal
function Mirror:run()
	local sector1, _, sector3 = Game.divideOpponentsIntoSectors(false)
	local sector = self._side and sector3 or sector1

	local targetPosX
	if #sector == 0 then
		targetPosX = (self._side and 1 or -1) * World.Geometry.FieldWidthQuarter
	else
		local minDist = math.huge
		local lastMinDist = self._lastTargetRobot and
				self._lastTargetRobot.pos:distanceTo(World.Geometry.FriendlyGoal) or
				math.huge
		local targetRobot = nil
		for _,r in pairs(sector) do
			local dist = r.pos:distanceTo(World.Geometry.FriendlyGoal)
			if dist < minDist then
				minDist = dist
				targetRobot = r
			end
		end
		if minDist + Settings.distanceHysteresis < lastMinDist or
				(self._side and 3 or 1) ~= Game.getSector(self._lastTargetRobot, true) then
			self._lastTargetRobot = targetRobot
		end
		targetPosX = self._lastTargetRobot.pos.x
	end	

	local pos = Vector.create(targetPosX, -self._distance - self._robot.radius)
	self._targetPos = Field.limitToField(pos, -self._robot.radius)

	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)
	
	self._robot.trajectory:update(ToTarget, self._targetPos, math.pi/2)
end

function Mirror.factory(position, side, distanceToCenterLine)
	local f = function (robots)
		return Mirror.create(robots[position], side, distanceToCenterLine)
	end
	return f
end

function Mirror.test(id)
	if id > 1 then
		return nil
	end
	return Mirror.factory(1, (id == 0), 0.1), 1
end

return Mirror
