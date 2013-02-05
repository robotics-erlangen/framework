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

--- does an approximate mirror of the enemy team 
function FarMirror:_run() 
	local tmpPos = Game.gameFocus()

	local targetX = tmpPos.x 
	local targetY = getY(targetX)

	-- copied from mirror task 
	local pos = Vector.create(targetX, targetY - self._robot.radius) 
	pos = Field.limitToField(pos, -self._robot.radius) 

	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)

	self._robot.trajectory:update(ToTarget, pos, math.pi/2)
end 


-- gets the y-Value for a given x-Value
-- returns a V-shape 
-- @param xPos int
-- @return int 
local function getY(xPos) 
	local height = World.Geometry.FieldHeightHalf
	local middleHeight = height / 2
	local sideHeight = height / 4
	local width = World.Geometry.FieldWidthHalf
	
	return middleHeight - (math.abs(xPos) / width) * sideHeight
end 
