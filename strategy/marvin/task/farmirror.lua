local FarMirror = (require "../base/class").new("Task.FarMirror", require "task/base")

local World = require "../base/world"
local Game = require "observer/game"
local ToTarget = require "trajectory/totarget"
local Field = require "util/field"

-- TODO was soll das? 
FarMirror.priority = 1

--- init
function FarMirror:_init()
end 


-- gets the y-Value for a given x-Value
-- returns a V-shape 
-- @param xPos int
-- @return int 
local function getY(xPos) 
	local height = -World.Geometry.FieldHeightHalf
	local middleHeight = height / 2
	local sideHeight = height / 4
	local width = World.Geometry.FieldWidthHalf
	
	return middleHeight - (math.abs(xPos) / width) * sideHeight
end 

--- does an approximate mirror of the enemy team 
function FarMirror:_run() 
	local tmpPos = Game.gameFocus()
	--TODO increase the variation of the x value (*2 seems quite useful)

	local targetX = tmpPos.x 
	local targetY = getY(targetX)

	-- copied from mirror task 
	local pos = Vector.create(targetX, targetY - self._robot.radius) 
	pos = Field.limitToField(pos, -self._robot.radius) 

	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)

	self._robot.trajectory:update(ToTarget, pos, math.pi/2)
end 




local inst
function FarMirror.test()
	local robot = World.FriendlyRobots[1]
	if robot then
		inst = inst or FarMirror.create(robot)
		return inst
	else
		inst = nil
	end
end

return FarMirror
