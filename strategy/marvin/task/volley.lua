local Volley = (require "../base/class").new("Task.Volley", require "task/shootgoal")

local Robot = require "observer/robot"
local Goal = require "observer/goal"
local Shoot = require "observer/shoot"

local World = require "../base/world"
local G = World.Geometry
local ball = World.Ball
local geom = require "../base/geom"
local vis = require "../base/vis"


Volley.priority = 5

local t = 0.35

local function robotList(selfRobot, viewPos)
	local robots = {}
	for _,r in pairs(World.Robots) do
		if r.pos.y > viewPos.y and r ~= selfRobot then
			table.insert(robots, r)
		end
	end
	return robots
end

function Volley:_init(origBallPos)
	self._bestMid = G.OpponentGoal
	self._origBallPos = origBallPos
	self._t = t
end

function Volley:_rate()
	return Robot.minTimeToBall(self._robot, World.Ball) 
end

function Volley:canShoot()
	return self:_canShoot()
end

function Volley:_canShoot()
	self:updateDestination()
	local angleDiff = math.abs(geom.getAngleDiff((self.targetPoint - World.Ball.pos):angle(), self._robot.dir))
	return angleDiff < self.maxAngleError or angleDiff < Settings.minAnglePrecision
end

function Volley:_run()
	self:updateDestination()
	-- viewPos
	local minViewX = -World.Geometry.FieldWidthHalf
	local maxViewX = World.Geometry.FieldWidthHalf
	local midX = minViewX * (1-self._t) + maxViewX * self._t
	if self._origBallPos.x > 0 then
		midX = -midX
	end
	self._viewPos = Vector.create(midX, World.Geometry.FieldHeightHalf)
	vis.addCircle("Volley ViewPos", self._viewPos, 0.2, vis.colors.redHalf, true)
	
	-- shoot
	self._robot:shoot(math.huge, 0)
	self:_catchBall(self._viewPos, math.huge, true)
end

function Volley.factory(position)
	local f = function (robots)
		return Volley.create(robots[position])
	end
	return f
end

function Volley.test(id)
	if id > 0 then
		return nil
	end
	return Volley.factory(1), 1
end

return Volley
