local Behavior = require "agent/base/behavior"
local Shooter = require "moves/mrlcorner/shooter"
local Pass = require "task/pass"
local MoveToStaticBall = require "task/movetostaticball"
local MoveToPos = require "task/movetopos"
local World = require "../base/world"
local Referee = require "../base/referee"
local Messaging = require "control/messaging"
local Ball = require "observer/ball"
local ShootGoal = require "task/shootgoal"
local debug = require "../base/debug"

local MrlCorner = Class("Behavior.MrlCorner", Behavior)

local ENABLE = true

local ROLES = {
    "distractor",
    "distractor",
    "distractor",
    "assistant",
    "shooter"
}

local DISTRACTOR_POSITIONS = {
    Vector(-0.2, 2.7),
    Vector(0, 2.7),
    Vector(0.2, 2.7)
}

function MrlCorner:_stop()
    self._stayActive = false
    self._role = nil
    self._distractorPos = nil
    self._freeKickOver = false
    self._shooter = nil
    self._assistant = nil
    self._shootGoalActive = false
end

local function outOfField(ball)
    return math.abs(ball.pos.x) > World.Geometry.FieldWidthHalf
        and math.abs(ball.pos.y) > World.Geometry.FieldHeightHalf
end

local function sortById(robot1, robot2)
    return robot1.id < robot2.id
end

function MrlCorner:check()
    if not ENABLE then
        return false
    else
        if self._stayActive and World.RefereeState == "Game" then
            self._freeKickOver = true
        elseif World.Ball.pos.y > 0 and (World.RefereeState == "Stop"
                or Referee.isFriendlyFreeKickState()) and Referee.opponentTouchedLast() then
            self._send.standardMoveFlag("all")
            local involvedRobots = {}
            for robot, _ in pairs(Messaging.get("standardMoveFlag")) do
                table.insert(involvedRobots, robot)
            end
            if #involvedRobots ~= #ROLES then -- wait for the messages to arrive
                return false
            end
            table.sort(involvedRobots, sortById)
            for i, robot in ipairs(involvedRobots) do
                if robot == self._robot then
                    self._role = ROLES[i]
                    if ROLES[i] == "distractor" then
                        self._distractorPos = DISTRACTOR_POSITIONS[i]
                    end
                end
                if ROLES[i] == "shooter" then
                    self._shooter = robot
                end
                if ROLES[i] == "assistant" then
                    self._assistant = robot
                end
            end
            assert(self._role, "role assignment of standard move went wrong")
            self._stayActive = true
        end
        if self._stayActive then
            self._send.standardMoveFlag("all")
            debug.set("freekick over", self._freeKickOver)
            return true
        else
            return false
        end
    end
end

function MrlCorner:_oppIntercepted()
    return self._freeKickOver and Ball.isShot() and Referee.opponentTouchedLast()
end

function MrlCorner:_updateTask()
    if self._freeKickOver and
            (outOfField(World.Ball)
            or self:_oppIntercepted()
            or Ball.isShot() == self._shooter) then
        self._stayActive = false
    end

    if self._role == "shooter" then
        if Ball.isShot() or self._shootGoalActive then -- maybe coordinate via messages
            self._shootGoalActive = true
            return ShootGoal
        else
            return Shooter, { self._assistant }
        end
    elseif self._role == "assistant" then
        if Ball.isShot() == self._robot then
            self._stayActive = false
        end
        local passReceiver, passData = next(self._inbox.passSuggestion())
        if passReceiver then
            return Pass, { passReceiver, passData.pos }
        else
            return MoveToStaticBall
        end
    elseif self._role == "distractor" then
        return MoveToPos, { self._distractorPos, 0 }
    else
        error("unknown role " .. self._role)
    end
end

return MrlCorner
