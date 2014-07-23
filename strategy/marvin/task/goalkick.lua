local Task = require "task/base"
local Shoot = require "task/ability/shoot"
local CatchBall = require "task/ability/catchball"
local ReceivePass = require "task/ability/receivepass"
local Volley = require "task/ability/volley"
local GoalKick = (require "../base/class").newTask("Task.GoalKick", Task, Shoot, CatchBall, ReceivePass, Volley)

local World = require "../base/world"

function GoalKick:run()
	local leftUpperCorner = Vector.create(World.Ball.pos.x + 0.1, World.Geometry.FieldHeightHalf / 2)
	local rightUpperCorner = Vector.create(World.Ball.pos.x - 0.1, World.Geometry.FieldHeightHalf / 2)
	local shootPos = World.Ball.pos.x > 0 and rightUpperCorner or leftUpperCorner
	local linear = true
	self:_shoot(shootPos, 1, linear, 3 * math.pi/180)
end

return GoalKick
