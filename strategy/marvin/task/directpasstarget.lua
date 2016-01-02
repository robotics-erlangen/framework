local Task = require "task/base"
local PassTarget = Class("Task.PassTarget", Task)

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"


-- Purpose: Just hold position until a/a/shoot takes over
function PassTarget:run()
    self._robot.trajectory:update(ToTarget, self._robot.pos, (World.Ball.pos - self._robot.pos):angle())
    self._send.moveDest("all", self._robot.pos)
end

return PassTarget
