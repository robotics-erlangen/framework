local SuggestPass = {}

local World = require "../base/world"
local Robot = require "observer/robot"
local Goal = require "observer/goal"
local debug = require "../base/debug"
local Ball = require "observer/ball"
local vis = require "../base/vis"

local function minDistToAllRobots(pos)
    local minDist = math.huge
    for _, robot in ipairs(World.Robots) do
        local dist = robot.pos:distanceTo(pos)
        if dist < minDist then
            minDist = dist
        end
    end
    return minDist
end

local chipRatingFactor = 0.5 -- reduce rating when only a chip is possible
local minDirectPassY = -World.Geometry.FieldHeightHalf / 3
function SuggestPass:_suggestPass()
    local mainAttacker = self._inbox.mainAttacker().trainer
    if not mainAttacker then
        return
    end

    local passPos
    local bestRating = 0
    local goal = World.Geometry.OpponentGoal

    -- check for directpass, with chipkick
    if self._robot.pos.y > minDirectPassY and Robot.wayToRobotFree(self._robot, mainAttacker, true) then
        local biggestInterval = Goal.largestFreeSector(self._robot.pos, World.OpponentRobots, true)
        bestRating = biggestInterval and (biggestInterval[2] - biggestInterval[1]) or 0.001
        local angle = (self._robot.pos-goal):absoluteAngleDiff(World.Ball.pos-goal)
        debug.set("angle", angle)
        bestRating = bestRating * angle
        if not Robot.wayToRobotFree(self._robot, mainAttacker) then -- chip necessary
            bestRating = bestRating * chipRatingFactor
        end
    end

    local searchWidth = 0.5
    local searchHeight = 0.8
    local stepSize = 0.25
    local timeTolerance = 0.5
    local minDistToAll = 0.4
    local minDistToBall = 0.7

     -- try to be at the center of the opponent field half
    local centerX = self._robot.pos.x
    local centerY = (self._robot.pos.y + World.Geometry.FieldHeightHalf/2)/2

    local boundX = World.Geometry.FieldWidthHalf - 2 * self._robot.radius
    local boundY = World.Geometry.FieldHeightHalf - 2 * self._robot.radius
    local startX = math.max(centerX - searchWidth, -boundX)
    local startY = math.max(centerY - searchHeight, -boundY)
    local endX = math.min(centerX + searchWidth, boundX)
    local endY = math.min(centerY + searchHeight, boundY)

    local ballOwner = Ball.friendlyBallOwner()
    for x=startX, endX, stepSize do
        for y=startY, endY, stepSize do
            local p = Vector.create(x, y)

            vis.addCircle("t/a/suggestpass: Sample Points", p, 0.03, vis.colors.skyBlue, true)
            if Robot.wayToPosFree(p, mainAttacker) then
                -- TODO
                -- accurate estimation if we can reach the ball before an opponent
                -- and if no friendly robot is around
                if not ballOwner or p:distanceTo(ballOwner.pos) > minDistToBall then
                    if minDistToAllRobots(p) > minDistToAll then
                        local timeBallToP = Robot.minTimeToBall(mainAttacker, World.Ball)
                            + Ball.rollTimeEndspeed(Settings.shootDriveSpeed, World.Ball.pos:distanceTo(p))
                        local timeSelfToP = Robot.timeToPos(self._robot, p)
                        local timeAdvance = timeBallToP - timeSelfToP
                        if timeAdvance < timeTolerance then
                            local biggestInterval = Goal.largestFreeSector(p, World.OpponentRobots, true)
                            local rating = biggestInterval and (biggestInterval[2] - biggestInterval[1]) or 0.001
                            local angle = (p-goal):absoluteAngleDiff(World.Ball.pos-goal)
                            rating = rating * angle
                            if rating > bestRating then
                                debug.set("angle", angle)
                                bestRating = rating
                                passPos = p
                            end
                            -- for more criteria, have a look at CMDragon 2014 TDP
                        end
                    end
                end
            end
        end
    end

    if bestRating > 0 then
        if passPos then
            vis.addCircle("t/a/suggestpass: passSuggestion", passPos, 0.1, vis.colors.red, true)
        end
        debug.set("pass kind", passPos and "in the run" or "direct")
        self._send.passSuggestion(mainAttacker, { rating = bestRating, pos = passPos })
    end
end

return SuggestPass
