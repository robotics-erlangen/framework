local Task = require "task/base"
local Shoot = require "task/ability/shoot"
local GoalKick = Class("Task.GoalKick", Task, Shoot)

local World = require "../base/world"


function GoalKick:run()
	local shootPos = World.Geometry.OpponentPenaltySpot
	self:_shoot(shootPos, 1, false, 3 * math.pi/180)
end

return GoalKick
