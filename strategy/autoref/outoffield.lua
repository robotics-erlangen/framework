local OutOfField = {}

local World = require "../base/world"
local Referee = require "../base/referee"
local rightLine = World.Geometry.FieldWidthHalf
local leftLine = -rightLine
local opponentGoalLine = World.Geometry.FieldHeightHalf
local friendlyGoalLine = -opponentGoalLine


local function isInField()
    local ballPos = World.Ball.pos
    return ballPos.x <= rightLine
        and ballPos.x >= leftLine
        and ballPos.y >= friendlyGoalLine
        and ballPos.y <= opponentGoalLine
end

local wasInFieldBefore = false
function OutOfField.occuring()
    if wasInFieldBefore and not isInField() then
        wasInFieldBefore = false
        return true
    elseif isInField() then
        wasInFieldBefore = true
    end
    return false
end

function OutOfField.print()
        log("Ball out field")
        log("Last touch: " .. ((World.TeamIsBlue and Referee.friendlyTouchedLast()) and "blue" or "yellow"))
end

return OutOfField
