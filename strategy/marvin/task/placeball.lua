local PlaceBall = Class("Task.PlaceBall", require "task/base")

local debug = require "../base/debug"
local World = require "../base/world"
local Direct = require "trajectory/direct"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"

local STEP_GO_TO_BALL = "goToBall"
local STEP_ENSURE_CONTACT = "contact"
local STEP_PULL = "pull"

function PlaceBall:_init()
    self._step = STEP_GO_TO_BALL
    self._lastOffset = nil
    self._ballStartPos = nil
end

local function isBallNearRobot(ball, robot)
    local dribblerPos = robot.pos + Vector.fromAngle(robot.dir) * robot.shootRadius
    -- assume that the ball is invisible because it's hidden by the robot
    return not ball:isPositionValid() or ball.pos:distanceTo(dribblerPos) < ball.radius + 0.06 or ball.pos:distanceTo(robot.pos) < robot.shootRadius
end

function PlaceBall:run()
    local ignoreBall = (self._step ~= STEP_GO_TO_BALL)
    PathHelper.setDefaultObstacles(self._robot.path, self._robot, ignoreBall)
    PathHelper.addRobotObstacles(self._robot.path, self._robot)

    debug.set("step", self._step)
    -- offset to ball pos, don't update if near the ball placement pos
    if not self._lastOffset or World.Ball.pos:distanceTo(World.BallPlacementPos) > 0.2 then
        self._lastOffset = (World.Ball.pos - World.BallPlacementPos):setLength(World.Ball.radius + self._robot.shootRadius)
    end
    local dir = self._lastOffset:angle()

    if self._step == STEP_GO_TO_BALL then
        local targetPos = World.Ball.pos - self._lastOffset
        self._robot.trajectory:update(ToTarget, targetPos, dir)

        local dist = targetPos:distanceTo(self._robot.pos)
        if dist < 0.04 then
            self._step = STEP_ENSURE_CONTACT
            self._ballStartPos = World.Ball.pos
        end

    elseif self._step == STEP_ENSURE_CONTACT then
        self._robot:setDribblerSpeed(1.0)
        -- Push ball a little bit then move backwards
        local speed = self._lastOffset:copy():setLength(0.3)
        self._robot.trajectory:update(Direct, speed, dir)

        debug.set("dist", self._ballStartPos:distanceTo(World.Ball.pos))
        debug.set("valid", World.Ball:isPositionValid())

        if not isBallNearRobot(World.Ball, self._robot) then
            self._step = STEP_GO_TO_BALL
        elseif not World.Ball:isPositionValid() or self._ballStartPos:distanceTo(World.Ball.pos) > 0.03 then
            self._step = STEP_PULL
        end

    elseif self._step == STEP_PULL then
        -- move ball into position
        local targetPos = World.BallPlacementPos - self._lastOffset
        self._robot.trajectory:update(ToTarget, targetPos, dir, nil, nil, 0.25)

        local dribblerSpeed = math.min((World.Ball.pos:distanceTo(World.BallPlacementPos) - 0.02) * 3, 1)
        self._robot:setDribblerSpeed(dribblerSpeed)

        if not isBallNearRobot(World.Ball, self._robot) then
            self._step = STEP_GO_TO_BALL
        end
    end
end

return PlaceBall
