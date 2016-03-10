local PlaceBall = Class("Task.PlaceBall", require "task/base")

local debug = require "../base/debug"
local World = require "../base/world"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"

function PlaceBall:_init()
    self._goToBall = true
end

function PlaceBall:run()
    PathHelper.setDefaultObstacles(self._robot.path, self._robot, true)
    PathHelper.addRobotObstacles(self._robot.path, self._robot)

    local dir = (World.Ball.pos - self._robot.pos):angle() -- towards ball

    if self._goToBall then
        local ofs = (World.Ball.pos - World.BallPlacementPos):setLength(World.Ball.radius + self._robot.shootRadius - 0.02)
        local targetPos = World.Ball.pos - ofs
        self._robot.trajectory:update(ToTarget, targetPos, dir)

        local dist = targetPos:distanceTo(self._robot.pos)
        if dist < 0.05 then
            self._robot:setDribblerSpeed(1.0)
        end
        if dist < 0.01 or not World.Ball:isPositionValid() then
            -- FIXME: if ball is in light brake
            -- Push ball a little bit the move backwards
            self._goToBall = false
        end
    else -- move ball into position
        -- FIXME: stabilize direction if near target
        local ofs = (World.Ball.pos - World.BallPlacementPos):setLength(World.Ball.radius + self._robot.shootRadius)
        local targetPos = World.BallPlacementPos - ofs
        self._robot.trajectory:update(ToTarget, targetPos, dir, 1, nil, true)

        if World.Ball.pos:distanceTo(self._robot.pos) > World.Ball.radius + self._robot.shootRadius + 0.05 then
            self._goToBall = true
        end
        if World.Ball.pos:distanceTo(World.BallPlacementPos) > 0.02 then
            self._robot:setDribblerSpeed(1.0)
        else
            self._robot:setDribblerSpeed(0)
        end
    end
    debug.set("goToBall", self._goToBall)
end

return PlaceBall
