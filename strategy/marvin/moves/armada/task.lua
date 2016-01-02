local SuggestPass = require "task/ability/suggestpass"
local ArmadaTask = Class("Task.ArmadaTask", require "task/base", SuggestPass)

local debug = require "../base/debug"
local World = require "../base/world"
local Messaging = require "control/messaging"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


local G = World.Geometry

-- the armada has 4 steps to form stairs, depending on ball distance
local X_POSITIONS_ORIG = {
    G.FieldWidthHalf * 5/8,
    G.FieldWidthHalf * 1/4,
    -G.FieldWidthHalf * 1/4,
    -G.FieldWidthHalf * 5/8
}
local Y_BALL_DISTS_RIGHT_ORIG = {
    -G.FieldHeightHalf * 1/4,
    0,
    G.FieldHeightHalf * 1/4,
    G.FieldHeightHalf * 1/2,
}
local Y_BALL_DISTS_LEFT_ORIG = {
    G.FieldHeightHalf * 1/2,
    G.FieldHeightHalf * 1/4,
    0,
    -G.FieldHeightHalf * 1/4
}

local X_POSITIONS = {}
local Y_BALL_DISTS_RIGHT = {}
local Y_BALL_DISTS_LEFT = {}
local CIRCLE_CENTER_ORIG = Vector(0,-1)
local CIRCLE_CENTER = Vector(0,0)
local MAX_RANDOM_POSITION_OFFSET = 0.3

local function sortByX(robot1, robot2)
    return robot1.pos.x > robot2.pos.x
end

local function shufflePositions()
    for i, pos in ipairs (X_POSITIONS_ORIG) do
        X_POSITIONS[i] = pos + (math.random()-0.5)*2 * MAX_RANDOM_POSITION_OFFSET
    end
    for i, pos in ipairs (Y_BALL_DISTS_RIGHT_ORIG) do
        Y_BALL_DISTS_RIGHT[i] = pos + (math.random()-0.5)*2 * MAX_RANDOM_POSITION_OFFSET
    end
    for i, pos in ipairs (Y_BALL_DISTS_LEFT_ORIG) do
        Y_BALL_DISTS_LEFT[i] = pos + (math.random()-0.5)*2 * MAX_RANDOM_POSITION_OFFSET
    end
    CIRCLE_CENTER.x = CIRCLE_CENTER_ORIG.x + (math.random()-0.5)*2 * MAX_RANDOM_POSITION_OFFSET
    CIRCLE_CENTER.y = CIRCLE_CENTER_ORIG.y + (math.random()-0.5)*2 * MAX_RANDOM_POSITION_OFFSET
end

function ArmadaTask:_init(posIndex)
	self._posIndex = posIndex
    self._moveDest = nil
    self._armadaPosTaken = false
    if posIndex == 1 then
        shufflePositions()
    end
end

function ArmadaTask:_pointOnCircle()
    local angle = (World.Time % 1000) % (math.pi/2)
    local individualAngle = angle + (math.pi/2)*self._posIndex
    local pos = CIRCLE_CENTER + Vector.fromAngle(individualAngle)*0.5
    return pos
end

function ArmadaTask:run()
    debug.set("posIndex" , self._posIndex)
    local moveDest = CIRCLE_CENTER
    if World.RefereeState == "Stop" then
        self._moveDest = self:_pointOnCircle()
    else -- Direct or Indirect Freekick
        if not self._armadaPosTaken then
            -- the behavior ensures that there are always 4 involved robots
            local involvedRobots = {}
            for robot, _ in pairs(Messaging.get("standardMoveFlag")) do
                table.insert(involvedRobots, robot)
            end
            table.sort(involvedRobots, sortByX)
            for i, robot in ipairs(involvedRobots) do
                if robot == self._robot then
                    local yPos = Y_BALL_DISTS_LEFT[i]
                    if World.Ball.pos.x > 0 then
                        yPos = Y_BALL_DISTS_RIGHT[i]
                    end
                    self._moveDest = Vector(X_POSITIONS[i], yPos)
                    self._armadaPosTaken = true
                end
            end
        end
        self:_suggestPass()
    end
    PathHelper.setDefaultObstacles(self._robot.path, self._robot)
    PathHelper.addRobotObstacles(self._robot.path, self._robot)
    self._robot.trajectory:update(ToTarget, self._moveDest , (World.Ball.pos - self._robot.pos):angle())
end

return ArmadaTask
