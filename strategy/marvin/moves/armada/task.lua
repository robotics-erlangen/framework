local SuggestPass = require "task/ability/suggestpass"
local ArmadaTask = Class("Task.ArmadaTask", require "task/base", SuggestPass)
local ToTarget = require "trajectory/totarget"
local World = require "../base/world"
local G = World.Geometry

-- the armada has 4 steps to form stairs, depending on ball distance
local X_POSITIONS = {
    G.FieldWidthHalf * 5/8,
    G.FieldWidthHalf * 1/4,
    -G.FieldWidthHalf * 1/4,
    -G.FieldWidthHalf * 5/8
}
local Y_BALL_DISTS_RIGHT = {
    -G.FieldHeightHalf * 1/4,
    0,
    G.FieldHeightHalf * 1/4,
    G.FieldHeightHalf * 1/2,
}
local Y_BALL_DISTS_LEFT = {
    G.FieldHeightHalf * 1/2,
    G.FieldHeightHalf * 1/4,
    0,
    -G.FieldHeightHalf * 1/4
}

function ArmadaTask:_init(posIndex)
	self._posIndex = posIndex
end

function ArmadaTask:run()
    local ballY = World.Ball.pos.y
    local yPos = Y_BALL_DISTS_LEFT[self._posIndex]
    if World.Ball.pos.x > 0 then
        yPos = Y_BALL_DISTS_RIGHT[self._posIndex]
    end
    local moveDest = Vector(X_POSITIONS[self._posIndex], yPos)
    self._robot.path:setDefaultObstacles(self._robot)
    self._robot.path:addRobotObstacles(self._robot)
	self._robot.trajectory:update(ToTarget, moveDest, (World.Ball.pos - self._robot.pos):angle())

    self:_suggestPass()
end

return ArmadaTask
