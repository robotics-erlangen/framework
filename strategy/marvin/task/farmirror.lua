local FarMirror = (require "../base/class").new("Task.FarMirror", require "task/base")

local World = require "../base/world"
local Game = require "observer/game"
local ToTarget = require "trajectory/totarget"
local Field = require "util/field"
local Robotlist = require "util/robotlist"
local debug = require "../base/debug"

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

local function weightX(robot)
	local distanceWeight = 1 -- how important the side robots are 
	return math.exp(distanceWeight * (math.abs(robot.pos.x) / World.Geometry .FieldWidthHalf))
end 

function FarMirror:run()
	-- determine approximate focus of opponent team
	local opponents = Robotlist.excludeRobot(World.OpponentRobots, World.OpponentKeeper)
	local avgPos = Game.averagePosition(opponents, weightX) 

	-- determine pos
	local targetX = avgPos.x 
	local targetY = getY(targetX)
	local pos = Vector.create(targetX, targetY - self._robot.radius) 
	local targetPos = Field.limitToField(pos, -self._robot.radius) 
	for robot, posTmp in pairs(self._inbox.moveDest()) do
		if targetPos:distanceTo(posTmp) < self._robot.radius and robot.id > self._robot.id then
			log(1);
			targetPos.x = -targetPos.x
		end
	end
	debug.set("FarMirrorTargetPos", targetPos)

	-- assign pos to robot 
	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot)
	if targetPos:isNan() then
		targetPos = Vector.create(0,-1.5)
	end
	self._robot.trajectory:update(ToTarget, targetPos, math.pi/2)
	self._send("all").moveDest(targetPos)
end

return FarMirror
