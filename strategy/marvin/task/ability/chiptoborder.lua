local ChipToBorder = {}

local World = require "../base/world"
local geom = require "../base/geom"
local vis = require "../base/vis"
local debug = require "../base/debug"
local ForceShoot = require "task/ability/forceshoot"
local leftMiddlePoint = Vector(-World.Geometry.FieldWidthHalf, 0)
local rightMiddlePoint = -leftMiddlePoint
local touchLineDir = Vector(0, 1)
local middleLineDir = leftMiddlePoint-rightMiddlePoint
local leftFriendlyCorner = Vector(-World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf)
local rightFriendlyCorner = Vector(World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf)
local chipImpactDistFromBorder = 0.5

ChipToBorder.depends = { ForceShoot }

function ChipToBorder:_chipToBorderIfSafe()
    local robotPos = self._robot.pos
    local ballPos = World.Ball.pos
    local robotDir = ballPos - robotPos
    local viewAngle = robotDir:angle()
    local rigthCornerAngle = (rightFriendlyCorner - robotPos):angle()
    local leftCornerAngle = (leftFriendlyCorner - robotPos):angle()
    if viewAngle > rigthCornerAngle or viewAngle < leftCornerAngle then -- not towards own goal line
        -- find furthest point on middle or touch line in robot-ball direction
        local touchLineIntersection, lambda = geom.intersectLineLine(robotPos, robotDir, leftMiddlePoint, touchLineDir)
        if lambda and lambda < 0 then -- intersection is behind me
            touchLineIntersection, lambda = geom.intersectLineLine(robotPos, robotDir, rightMiddlePoint, touchLineDir)
            if lambda and lambda < 0 then -- intersection is behind me
                touchLineIntersection = nil
            end
        end
        local middleLineIntersection = geom.intersectLineLine(robotPos, robotDir, leftMiddlePoint, middleLineDir)
        local chipPos = middleLineIntersection
        if chipPos and touchLineIntersection then
            if robotPos:distanceTo(touchLineIntersection) < robotPos:distanceTo(chipPos) then
                chipPos = touchLineIntersection
            end
        else -- no middleLineIntersection
            chipPos = touchLineIntersection
        end
        if not chipPos then -- probably because ball is out of field
            chipPos = World.Geometry.OpponentGoal
        end

        local chipDist = World.Ball.pos:distanceTo(chipPos)  - chipImpactDistFromBorder
        vis.addCircle("t/a/chipToBorder", ballPos + robotDir:setLength(chipDist), 0.1, vis.colors.blue, true)
        if not self._robot:hasBall(World.Ball) then
            self._forceShootTimer = nil
        end
        self:_doForceShoot()
        self._robot:chip(chipDist)
    end
end

return ChipToBorder
