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
local offsetTable = {} -- maps every robot in armada to an unique offset between 1 and 4

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
            self._send.poolChangeRequest("trainer")
            -- this causes another robot to become defender. this one does not
            -- participate in the formation anymore. Not very bad as the pass
            -- decision has already been made, but still not very consistent...
        end
        if self._stayActive and Referee.isFriendlyFreeKickState() then
            -- EXECUTION state (second): pass is executed
            if Ball.isShot() then -- let normal game take over
                self._stayActive = false
                offsetTable = {}
                return false
            end
            return true
        elseif World.Ball.pos.y > G.FieldHeightHalf/5 and Referee.opponentTouchedLast()
                and math.abs(World.Ball.pos.x) > G.FieldWidthHalf/2
                and (World.RefereeState == "Stop" or Referee.isFriendlyFreeKickState()) then
            -- PREPARE state(first): robots move to positions
            self._send.standardMoveFlag("all")
            local involvedRobots = {}
            for robot, _ in pairs(self._inbox.standardMoveFlag("broadcast")) do
                table.insert(involvedRobots, robot)
            end
            if #involvedRobots ~= 4 then -- wait for the messages to arrive
                offsetTable = {}
                return false
            end
            local offset = offsetTable[self._robot]
            if offset then -- regualar case, we are already in the table
                self._posIndex = offset
                self._stayActive = true
                return true
            end
            -- we are the former mainAttacker and take the place of the new mainAttacker
            if #offsetTable == 4 then
                local mainAttacker = self._inbox.mainAttacker().trainer
                if mainAttacker == nil then -- there is no new mainAttacker, we can't take its place
                    return false
                end
                offset = offsetTable[mainAttacker]
                table.remove(offsetTable, mainAttacker)
                offsetTable[self._robot] = offset
                self._posIndex = offset
                self._stayActive = true
                return true
            end
            -- this is the first frame of armada with a collection of 4 robots
            table.sort(involvedRobots, sortById)
            for i, robot in ipairs(involvedRobots) do
                if robot == self._robot then
                    self._posIndex = i
                    break
                end
            end
            if not self._posIndex then -- can happen if a mainAttacker changed in the first frame
                local mainAttacker = self._inbox.mainAttacker().trainer
                -- we are the former mainAttacker and our place is already taken
                if mainAttacker == nil then
                    return false
                end
                -- we are the former mainAttacker and take the place of the new mainAttacker
                for i, robot in ipairs(involvedRobots) do
                    if robot == mainAttacker then
                        self._posIndex = i
                        break
                    end
                end
                -- this should not be possible
                if not self._posIndex then
                    if amun.isDebug() then
                        error("armada: posIndex is nil for " .. tostring(self._robot))
                    else
                        log("armada: posIndex is nil for " .. tostring(self._robot))
                    end
                end
            end
            -- fill the table with the offsets
            offsetTable[self._robot] = self._posIndex
            self._stayActive = true
            return true
        end
        offsetTable = {}
        return false
    end
end

function Armada:_updateTask()
    return ArmadaTask, { self._posIndex }
end

return Armada
