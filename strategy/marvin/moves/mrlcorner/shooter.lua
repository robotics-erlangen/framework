-- stays in the back until coordinated with assistant
local Task = require "task/base"
local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"

local Shooter = Class("Task.Shooter", Task)

function Shooter:_init(assistant)
    self._assistant = assistant
end

local moveDestLeftBack = Vector(-1, -2.5)
local moveDestRightBack = Vector(1, -2.5)

local moveDestLeftFront = Vector(-2.2, 2.4)
local moveDestRightFront = Vector(2.2, 2.4)
function Shooter:run()
    local moveDest
    if World.RefereeState == "Stop" then
        moveDest = math.sign(World.Ball.pos.x) > 0 and moveDestRightBack or moveDestLeftBack
    else -- FreeKick state
        moveDest = math.sign(World.Ball.pos.x) > 0 and moveDestRightFront or moveDestLeftFront
        if self._robot.pos:distanceTo(moveDest) < 0.4 then
            self._send.passSuggestion(self._assistant, { rating = math.huge })
        end
    end

    PathHelper.setDefaultObstacles(self._robot.path, self._robot)
	PathHelper.addRobotObstacles(self._robot.path, self._robot)
    self._robot.trajectory:update(ToTarget, moveDest, 0)
end

return Shooter
