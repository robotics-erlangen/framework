local PlaceBall = Class("Task.PlaceBall", require "task/base")

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
        self._robot.trajectory:update(ToTarget, World.Ball.pos, dir)
        -- TODO
        -- if close to ball, activate dribbler
        -- if ball is in light brake: self._goToBall to false
    else -- move ball into position, possible approach:
        -- first, turn slowly
        -- then move directly to position, with reduced speed
	   self._robot.trajectory:update(ToTarget, World.BallPlacementPos, dir)
    end
end

return PlaceBall
