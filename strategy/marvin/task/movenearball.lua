local MoveNearBall = (require "../base/class").newTask("Task.MoveNearBall", require "task/catchball")
local World = require "../base/world"

function MoveNearBall:run()
    self:_catchBall(World.Geometry.OpponentGoal)
end

return MoveNearBall
