local ChipToBorder = {}

local World = require "../base/world"
local geom = require "../base/geom"
local vis = require "../base/vis"
local debug = require "../base/debug"
local ForceShoot = require "task/ability/forceshoot"

local touchLineDir = Vector(0, 1)

local leftFriendlyCorner = Vector(-World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf)
local rightFriendlyCorner = Vector(World.Geometry.FieldWidthHalf, -World.Geometry.FieldHeightHalf)
local chipImpactDistFromBorder = 0.5

local leftnearBasePoint = Vector(-World.Geometry.FieldWidthHalf, World.Geometry.FieldHeightHalf-1)
local rightnearBasePoint = Vector(World.Geometry.FieldWidthHalf, World.Geometry.FieldHeightHalf-1)
local nearBaseLineDir = leftnearBasePoint-rightnearBasePoint
local DIST_FACTOR = 0.25



ChipToBorder.depends = { ForceShoot }

function ChipToBorder:_chipToBorderIfSafe()
    local robotPos = self._robot.pos
    local ballPos = World.Ball.pos
    local robotDir = ballPos - robotPos
    local viewAngle = robotDir:angle()
    local rigthCornerAngle = (rightFriendlyCorner - robotPos):angle()
    local leftCornerAngle = (leftFriendlyCorner - robotPos):angle()
    if viewAngle > rigthCornerAngle or viewAngle < leftCornerAngle then -- not towards own goal line
        -- find furthest point on nearBaseline or touchline in robot-ball direction
        local touchLineIntersection, lambda = geom.intersectLineLine(robotPos, robotDir, leftnearBasePoint, touchLineDir)
        if lambda and lambda < 0 then -- intersection is behind me
            touchLineIntersection, lambda = geom.intersectLineLine(robotPos, robotDir, rightnearBasePoint, touchLineDir)
            if lambda and lambda < 0 then -- intersection is behind me
                touchLineIntersection = nil
            end
        end
        local nearBaseLineIntersection = geom.intersectLineLine(robotPos, robotDir, leftnearBasePoint, nearBaseLineDir)
        local chipPos = nearBaseLineIntersection

        if chipPos and touchLineIntersection then
            if robotPos:distanceTo(touchLineIntersection) < robotPos:distanceTo(chipPos) then
                chipPos = touchLineIntersection
            end
        else -- no nearBaseline
            chipPos = touchLineIntersection
        end
        if not chipPos then -- probably because ball is out of field
            chipPos = World.Geometry.OpponentGoal
        end
        local chipDist = World.Ball.pos:distanceTo(chipPos) - chipImpactDistFromBorder
        if chipPos ~= touchLineIntersection then -- if chip to Baseline then slow chip
            chipDist = chipDist*DIST_FACTOR         
        end

        vis.addCircle("t/a/chipToBorder", ballPos + robotDir:setLength(chipDist), 0.1, vis.colors.blue, true)
        if not self._robot:hasBall(World.Ball) then
            self._forceShootTimer = nil
        end
        self:_doForceShoot()
        self._robot:chip(chipDist)
    end
end

return ChipToBorder
