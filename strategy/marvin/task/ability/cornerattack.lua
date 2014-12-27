local CornerAttack = {}

local World = require "../base/world"
local G = World.Geometry
local Field = require "../base/field"
local constants = require "../base/constants"
local vis = require "../base/vis"
local debug = require "../base/debug"
local Robot = require "observer/robot"
local Rating = require "util/rating"
local ToTarget = require "trajectory/totarget"

local defStrech = G.DefenseStretch
local defRadius = G.DefenseRadius
local defAreaLineLength = G.DefenseStretch + defRadius * math.pi
local leftStretchOnGoalLine = Vector(-defStrech/2, World.Geometry.FieldHeightHalf)
local rightStretchOnGoalLine = Vector(defStrech/2, World.Geometry.FieldHeightHalf)
local defStretchY = World.Geometry.FieldHeightHalf - defRadius
local leftWayMax = (defAreaLineLength - defStrech) / 2
local rightWayMin = defAreaLineLength - defRadius * math.pi / 2
local function oppDefLineWayToPoint(way)
    if way < leftWayMax then
        return rightStretchOnGoalLine + Vector.fromAngle(-way/defRadius):setLength(defRadius)
    elseif way > rightWayMin then
        local angle = -((way - defAreaLineLength)/defRadius + math.pi)
        return leftStretchOnGoalLine + Vector.fromAngle(angle):setLength(defRadius)
    else
        return Vector(way - defAreaLineLength/2, defStretchY)
    end
end

local bestGap, lastRun
local oppDefAreaDistance = 2 * constants.maxRobotRadius
local function scanForBestGapInDefense()
    if lastRun == World.Time then
        return bestGap
    end
    lastRun = World.Time

    local occupiedSpots = {}
    local defLineBegin = 0
    local defLineEnd = defAreaLineLength
    -- take out 0.7m on the corner kick side
    if World.Ball.pos.x > 0 then -- right corner
        defLineBegin = defLineBegin + 0.7
    else
        defLineEnd = defLineEnd - 0.7
    end
    table.insert(occupiedSpots, defLineBegin)
    table.insert(occupiedSpots, defLineEnd)

    for _, opp in ipairs(World.OpponentRobots) do
        if Field.distanceToOpponentDefenseArea(opp.pos, opp.radius) < oppDefAreaDistance
            and opp ~= World.OpponentKeeper then
            local towardsGoal = World.Geometry.OpponentGoal - opp.pos
            local _, way = Field.intersectLineDefenseArea(opp.pos, towardsGoal, 0, true)
            if way > defLineBegin and way < defLineEnd then
                table.insert(occupiedSpots, way)
            end
        end
    end
    table.sort(occupiedSpots)

    -- biggestGap in occupiedSpots
    local biggestGap = { defLineBegin, defLineBegin }
    for i=1,#occupiedSpots do
        if occupiedSpots[i+1] and occupiedSpots[i+1]  - occupiedSpots[i] > biggestGap[2] - biggestGap[1] then
            biggestGap[1] = occupiedSpots[i]
            biggestGap[2] = occupiedSpots[i+1]
        end
    end

    local gapSize = biggestGap[2] - biggestGap[1]
    if gapSize > 2*constants.maxRobotRadius then
        bestGap = oppDefLineWayToPoint(biggestGap[1] + gapSize/2)
    end
    return bestGap
end

function CornerAttack:init()
    self._pointOfImpact = nil -- remember on exclusiveRole assignment
    self._isAssigned = false
end

-- returns true when an attack is performed
local distInsideDefArea = 0.1
function CornerAttack:_tryCornerAttack()
    local gap = scanForBestGapInDefense()
    if gap then -- apply for role: time to gap
        local mainAttacker = self._inbox.mainAttacker().trainer
        if mainAttacker then -- Prevent having no mainAttacker, FIXME: discuss if this is the right way
            local rating = Rating.timeToRating(Robot.timeToPos(self._robot, gap))
            self._send.exclusiveRole("trainer", { cornerAttacker = rating })
        end
        if self._inbox.cornerAttacker().trainer == self._robot then
            if not self._isAssigned then
                self._isAssigned = true
                self._pointOfImpact = gap + (World.Geometry.OpponentGoal-gap):setLength(distInsideDefArea)
            end
            vis.addCircle("t/a/cornerattack", self._pointOfImpact, 0.05, vis.colors.redHalf, true)

            if mainAttacker then
                self._send.passSuggestion(mainAttacker,
                    { kind = "in the run", rating = 1, pos = self._pointOfImpact })
            end

            self._robot.path:setDefaultObstacles(self._robot)
            self._robot.path:addRobotObstacles(self._robot)
            self._robot.trajectory:update(ToTarget, self._pointOfImpact, (World.Ball.pos - self._robot.pos):angle())
            self._send.moveDest("all", self._pointOfImpact)
            return true -- and hope to become mainAttacker
        end
    end
    return false
end

return CornerAttack
