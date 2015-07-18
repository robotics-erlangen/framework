local SuggestPass = {}

local World = require "../base/world"
local Robot = require "observer/robot"
local Physics = require "observer/physics"
local Goal = require "observer/goal"
local debug = require "../base/debug"
local Ball = require "observer/ball"
local vis = require "../base/vis"
local Referee = require "../base/referee"

local SHOOT_DRIVE_SPEED = 0.5

local MIN_OPP_DIST = 1
local MIN_OPP_SPEED = 1
local MIN_OPP_MOVING_TOWARDSME_ANGLE = 20/180 * math.pi
function SuggestPass:_noOppDisturbing()
    -- coarse heuristic: no opp is near or moving towards us
    local ballPos = World.Ball.pos
    for _, opp in ipairs(World.OpponentRobots) do
        if self._robot.pos:distanceTo(opp.pos) < MIN_OPP_DIST and
                ballPos:distanceTo(opp.pos) < ballPos:distanceTo(self._robot.pos) then
            return false
        end
        local angleToOpp = opp.speed:absoluteAngleDiff(self._robot.pos - opp.pos)
        if opp.speed:length() > MIN_OPP_SPEED and angleToOpp < MIN_OPP_MOVING_TOWARDSME_ANGLE then
            return false
        end
    end
    return true
end

local chipRatingFactor = 0.5 -- reduce rating when only a chip is possible
local minDirectPassY = World.Geometry.FieldHeightHalf / 6
function SuggestPass:_suggestPass(passPosRobot)
    local mainAttacker = self._inbox.mainAttacker().trainer
    if not mainAttacker then
        return
    end

    -- if no passPos was given, suggest a stationary (direct) pass
    passPosRobot = passPosRobot or self._robot.pos
    -- don't play deep back passes
    if passPosRobot.y < -G.FieldHeightHalf * 1/4 then
        return
    end

    -- take the current ball pos as origin of the pass
    local ballPos = World.Ball.pos

    -- assume the robot looks towards the ball
    local passPosBall = passPosRobot +
            (ballPos - passPosRobot):setLength(self._robot.shootRadius + World.Ball.radius)

    -- only send suggestions in the opponent half (no backward passes)
    -- and check the pass corridor
    -- FIXME wayToRobotFree does not take a future world state (conflicts with the concept of waiting)
    if passPosRobot.y > minDirectPassY or self:_noOppDisturbing() then

        -- calculate the pass rating
        local goal = World.Geometry.OpponentGoal
        local biggestInterval = Goal.largestFreeSector(passPosBall, World.OpponentRobots, true)
        local goalRating = biggestInterval and (biggestInterval[2] - biggestInterval[1]) or 0.001
        local angle = (passPosBall - goal):absoluteAngleDiff(ballPos - goal)
        local bestRating = goalRating * angle

        -- check if a chip is necessary
        if not Robot.wayToRobotFree(self._robot, mainAttacker) then
            bestRating = bestRating * chipRatingFactor
        end

        -- calculate the pass receive time
        local moveTime = Physics.robotTimeToPos(self._robot, passPosRobot, Vector(0, 0), true)
        local receiveTime = World.Time + moveTime

        vis.addCircle("t/a/suggestpass: passSuggestion", passPosRobot, 0.1, vis.colors.red, true)

        self._send.passSuggestion(mainAttacker,
                { rating = bestRating, pos = passPosBall, time = receiveTime })
    end
end

return SuggestPass
