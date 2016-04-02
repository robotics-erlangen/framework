local Base = require "agent/base/behavior"
local Armada = Class("Agent.Moves.Armada", Base)

local debug = require "../base/debug"
local Referee = require "../base/referee"
local World = require "../base/world"
local Messaging = require "control/messaging"
local ArmadaTask = require "moves/armada/task"
local Ball = require "observer/ball"


local G = World.Geometry
local ENABLE = true

local function sortById(robot1, robot2)
    return robot1.id < robot2.id
end

function Armada:_stop()
    self._posIndex = nil
    self._stayActive = false
end

function Armada:check()
    if not ENABLE or self._inbox.mainAttacker().trainer == self._robot then
        return false
    else
        debug.set("stay active", self._stayActive)
        local _, msg = next(self._inbox.passPos())
        local passToMe = msg and msg.robot == self._robot
        if passToMe and Class.name(self._agent) == "Agent.Defender" then
            self._send.attackerRequest("trainer")
			self._requestingPoolChange = true
			self._forceKeepingInPool = false
            -- this causes another robot to become defender. this one does not
            -- participate in the formation anymore. Not very bad as the pass
            -- decision has already been made, but still not very consistent...
        end
        if self._stayActive and Referee.isFriendlyFreeKickState() then
            -- EXECUTION state (second): pass is executed
            if Ball.isShot() then -- let normal game take over
                self._stayActive = false
                return false
            end
            return true
        elseif World.Ball.pos.y > G.FieldHeightHalf/5 and Referee.opponentTouchedLast()
                and math.abs(World.Ball.pos.x) > G.FieldWidthHalf/2
                and (World.RefereeState == "Stop" or Referee.isFriendlyFreeKickState()) then
            -- PREPARE state(first): robots move to positions
            self._send.standardMoveFlag("all")
            local involvedRobots = {}
            for robot, _ in pairs(Messaging.get("standardMoveFlag")) do
                table.insert(involvedRobots, robot)
            end
            if #involvedRobots ~= 4 then -- wait for the messages to arrive
                return false
            end
            table.sort(involvedRobots, sortById)
            for i, robot in ipairs(involvedRobots) do
                if robot == self._robot then
                    self._posIndex = i
                end
            end
            if not self._posIndex then -- can happen after an agent pool change
                return false
            end
            self._stayActive = true
            return true
        end
        return false
    end
end

function Armada:_updateTask()
    return ArmadaTask, { self._posIndex }
end

return Armada
