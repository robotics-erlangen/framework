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

function SuggestPass:_suggestPass()
    local mainAttacker = self._inbox.mainAttacker().trainer
    if not mainAttacker then
        return
    end

    local passPos, passKind
    local bestRating = 0
    local goal = World.Geometry.OpponentGoal

    -- check for directpass
    if Robot.wayToRobotFree(self._robot, mainAttacker) then
        local biggestInterval = Goal.largestFreeSector(self._robot.pos, World.OpponentRobots, true)
        bestRating = biggestInterval and (biggestInterval[2] - biggestInterval[1]) or 0.001
        local angle = (self._robot.pos-goal):absoluteAngleDiff(World.Ball.pos-goal)
        debug.set("angle", angle)
        bestRating = bestRating * angle
        passKind = "direct"
    end

    local searchWidth = 0.5
    local searchHeight = 0.8
    local stepSize = 0.25
    local timeTolerance = 0.5
    local minDistToAll = 0.7

    local startX = math.max(self._robot.pos.x - searchWidth, -World.Geometry.FieldWidthHalf + 2*self._robot.radius)
    local endX = math.min(self._robot.pos.x + searchWidth, World.Geometry.FieldWidthHalf - 2*self._robot.radius)
    local startY = self._robot.pos.y + searchHeight
    local endY = math.min(startY + searchHeight, World.Geometry.FieldHeightHalf - 2*self._robot.radius)

    for x=startX, endX, stepSize do
        for y=startY, endY, stepSize do
            local p = Vector.create(x, y)
            if Robot.wayToPosFree(p, mainAttacker) then
                -- TODO
                -- accurate estimation if we can reach the ball before an opponent
                -- and if no friendly robot is around
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
                            passKind = "in the run"
                        end
                        -- for more criteria, have a look at CMDragon 2014 TDP
                    end
                end
            end
        end
    end

    -- TODO check for chip passes

    if passKind then
        if passPos then
            vis.addCircle("passSuggestion", passPos, 0.1, vis.colors.red, true)
        end
        debug.set("pass kind", passKind)
        self._send.passSuggestion(mainAttacker, { kind = passKind, rating = bestRating, pos = passPos })
    end
end

return SuggestPass
