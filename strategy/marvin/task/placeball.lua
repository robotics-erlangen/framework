local PlaceBall = Class("Task.PlaceBall", require "task/base")

local debug = require "../base/debug"
local World = require "../base/world"
local Direct = require "trajectory/direct"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local vis = require "../base/vis"

local STEP_GO_TO_BALL = "goToBall"
local STEP_ENSURE_CONTACT = "contact"
local STEP_PULL = "pull"
local STEP_MOVE_AWAY = "moveAway"

local BALL_SLOW = 0.1
local BALL_PLACEMENT_RADIUS = 0.1
local MAX_SPEED = 0.7

function PlaceBall:_init()
    self._step = STEP_GO_TO_BALL
    self._lastOffset = nil
    self._ballStartPos = nil
    self._positionReachedTime = 0
    self._moveAwayPos = nil
end

local function isBallNearRobot(ball, robot)
    local dribblerPos = robot.pos + Vector.fromAngle(robot.dir) * robot.shootRadius
    -- assume that the ball is invisible because it's hidden by the robot
    return not ball:isPositionValid() or ball.pos:distanceTo(dribblerPos) < ball.radius + 0.06 or ball.pos:distanceTo(robot.pos) < robot.shootRadius
end

function PlaceBall:run()
    vis.addCircle("ball placement", World.BallPlacementPos, BALL_PLACEMENT_RADIUS, vis.colors.orangeHalf, true)
    local ballPos = World.Ball.pos

    debug.set("step", self._step)
    -- offset to ball pos, don't update if near the ball placement pos
    if not self._lastOffset or ballPos:distanceTo(World.BallPlacementPos) > 0.2 then
        self._lastOffset = (ballPos - World.BallPlacementPos):setLength(World.Ball.radius + self._robot.shootRadius)
    end
    local dir = self._lastOffset:angle()

    if self._step == STEP_GO_TO_BALL then
        local targetPos = ballPos - self._lastOffset
        PathHelper.setDefaultObstacles(self._robot.path, self._robot, true, true, true)
        PathHelper.addRobotObstacles(self._robot.path, self._robot)
        self._robot.trajectory:update(ToTarget, targetPos, dir)

        local dist = targetPos:distanceTo(self._robot.pos)
        if dist < 0.2 then
            self._robot:setDribblerSpeed(1.0)
        end
        if dist < 0.04 then
            self._step = STEP_ENSURE_CONTACT
            self._ballStartPos = ballPos
        end
    elseif self._step == STEP_ENSURE_CONTACT then
        self._robot:setDribblerSpeed(1.0)
        -- Push ball a little bit then move backwards
        local speed = self._lastOffset:copy():setLength(0.3)
        self._robot.trajectory:update(Direct, speed, dir)
        PathHelper.setDefaultObstacles(self._robot.path, self._robot, true, true, true)

        debug.set("ball dist", self._ballStartPos:distanceTo(ballPos))
        debug.set("ball valid", World.Ball:isPositionValid())

        if not isBallNearRobot(World.Ball, self._robot) then
            self._step = STEP_GO_TO_BALL
        elseif not World.Ball:isPositionValid() or self._ballStartPos:distanceTo(ballPos) > 0.03 then
            self._step = STEP_PULL
        end
    elseif self._step == STEP_PULL then
        -- move ball into position
        local targetPos = World.BallPlacementPos - self._lastOffset
        PathHelper.setDefaultObstacles(self._robot.path, self._robot, true, true, true)
        self._robot.trajectory:update(ToTarget, targetPos, dir, MAX_SPEED)

        if self._positionReachedTime == 0 then
            local dribblerSpeed = math.min((ballPos:distanceTo(World.BallPlacementPos) - 0.02) * 3, 1)
            self._robot:setDribblerSpeed(dribblerSpeed)
        end

        if not isBallNearRobot(World.Ball, self._robot) and self._positionReachedTime == 0 then
            self._step = STEP_GO_TO_BALL
        end

        local dribblerPos = self._robot.pos + Vector.fromAngle(self._robot.dir)*self._robot.shootRadius
        if isBallNearRobot(World.Ball, self._robot) and
                dribblerPos:distanceTo(World.BallPlacementPos) < BALL_PLACEMENT_RADIUS
                and self._positionReachedTime == 0 then
            self._positionReachedTime = World.Time
        end
        -- wait 1 second for the dribbler and the ball to stop
        if self._positionReachedTime ~= 0 and World.Time - self._positionReachedTime > 1 then
            self._step = STEP_MOVE_AWAY
            -- 20cm away from the ball, keeping current direction
            self._moveAwayPos = self._robot.pos - Vector.fromAngle(self._robot.dir):setLength(0.2)
        end
    elseif self._step == STEP_MOVE_AWAY then
        PathHelper.setDefaultObstacles(self._robot.path, self._robot, false, true, true, nil, 0.02)
    	PathHelper.addRobotObstacles(self._robot.path, self._robot)
        if isBallNearRobot(World.Ball, self._robot) or
                (World.Ball:isPositionValid() and self._robot.pos:distanceTo(ballPos) < 2*self._robot.radius) then
            self._robot.trajectory:update(ToTarget, self._moveAwayPos, self._robot.dir)
        elseif World.BallPlacementPos:distanceTo(Vector(0,0)) > 0.7 then
            self._robot.trajectory:update(ToTarget, Vector(0,0), 0)
        else
            self._robot.trajectory:update(ToTarget, Vector(2,0), 0)
        end
    end
end

return PlaceBall
