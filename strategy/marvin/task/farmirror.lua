local FarMirror = (require "../base/class").new("Task.FarMirror", require "task/base")

local World = require "../base/world"
local Geo = World.Geometry 
local Game = require "observer/game"
local ToTarget = require "trajectory/totarget"
local Field = require "util/field"

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
	-- determine approximate focus of opponent team
	local opponents = Robotlist.excludeRobot(World.OpponentRobots, World.OpponentKeeper)
	local avgPos = Game.averagePosition(opponents, weightX) 
	--TODO increase the variation of the x value (*2 seems quite useful)

	local targetX = avgPos.x 
	local targetY = getY(targetX)

	-- copied from mirror task 
	local pos = Vector.create(targetX, targetY - self._robot.radius) 
	pos = Field.limitToField(pos, -self._robot.radius) 

	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)

	self._robot.trajectory:update(ToTarget, pos, math.pi/2)
end 


-- gets the weight in x direction
-- exponential, with 1 at center, and e^(val) (greater than 1) at sideline 
local function weightX(robot) 
	local distanceWeight = 0.5 -- [0,1] how important the side robots are 
	return math.exp(fac * (math.abs(robot.pos.x) / Geo.FieldWidthHalf))
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
