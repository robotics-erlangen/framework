local Task = require "task/base"
local Shoot = require "task/ability/shoot"
local GoalKick = Class("Task.GoalKick", Task, Shoot)

local World = require "../base/world"

function GoalKick:run()
	local leftUpperCorner = Vector(World.Ball.pos.x + 0.05, -1)
	local rightUpperCorner = Vector(World.Ball.pos.x - 0.05, -1)
	local shootPos = World.Ball.pos.x > 0 and rightUpperCorner or leftUpperCorner
	local linear = false
	self:_shoot(shootPos, 1, linear, 3 * math.pi/180)
end

return GoalKick
