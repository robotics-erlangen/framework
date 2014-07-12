local OutOfField = {}

local World = require "../base/world"
local Referee = require "../base/referee"
local rightLine = World.Geometry.FieldWidthHalf
local leftLine = -rightLine
local opponentGoalLine = World.Geometry.FieldHeightHalf
local friendlyGoalLine = -opponentGoalLine

function OutOfField.occuring()
    local ballPos =  World.Ball.pos
    return ballPos.x > rightLine
        or ballPos.x < leftLine
        or ballPos.y > opponentGoalLine
        or ballPos.y < friendlyGoalLine
end

function OutOfField.print()
        log("Ball out field")
        log("Last touch: " .. ((World.TeamIsBlue and Referee.friendlyTouchedLast()) and "blue" or "yellow"))
end

return OutOfField
