local MoveNearBall = (require "../base/class").newTask("Task.MoveNearBall", require "task/catchball")
local World = require "../base/world"

MoveNearBall.priority = 1 -- no meaning

function MoveNearBall:_init()
end

function MoveNearBall:run()
    self:_catchBall(World.Geometry.OpponentGoal)
end

return MoveNearBall
