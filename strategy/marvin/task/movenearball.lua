-- load abilities
local CatchBall = require "task/ability/catchball"

local MoveNearBall = (require "../base/class").newTask("Task.MoveNearBall", require "task/base",
	CatchBall)

local World = require "../base/world"

function MoveNearBall:run()
    self:_catchBall(World.Geometry.OpponentGoal)
end

return MoveNearBall
