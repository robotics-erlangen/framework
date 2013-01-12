local Mirror = (require "../base/class").new("Task.Mirror", require "task/base")

local World = require "../base/world"
local Game = require "observer/game"
local ToTarget = require "trajectory/totarget"

Mirror.priority = 1

--- init
--@param side bool - if its on the right side
--@param distanceToCenterLine number - how far the robot stays away from the center line
function Mirror:_init(side, distanceToCenterLine)
	self._side = side
	self._distance = distanceToCenterLine
end

function Mirror:_run()
	local sector1, _, sector3 = Game.devideOpponentsIntoSectors(false)
	local sector = self._side and sector3 or sector1

	local targetPosX
	if #sector == 0 then
		targetPosX = (self._side and 1 or -1) * World.Geometry.FieldWidthQuarter
	else
		local minDist = math.huge
		local targetRobot = nil
		for _,r in pairs(sector) do
			local dist = r.pos:distanceTo(World.Geometry.FriendlyGoal)
			if dist < minDist then
				minDist = dist
				targetRobot = r
			end
		end
		targetPosX = targetRobot.pos.x
	end	

	local pos = Vector.create(targetPosX, -self._distance - self._robot.radius)

	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)
	
	self._robot.trajectory:update(ToTarget, pos, math.pi/2)
end

return Mirror
