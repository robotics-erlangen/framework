local OutOfField = {}

local World = require "../base/world"
local Referee = require "../base/referee"
local rightLine = World.Geometry.FieldWidthHalf
local leftLine = -rightLine
local opponentGoalLine = World.Geometry.FieldHeightHalf
local friendlyGoalLine = -opponentGoalLine

local possibleRefStates = {
    Game = true,
    GameForce = true,
    KickoffOffensive = true,
    KickoffDefensive = true,
    PenaltyOffensive = true,
    PenaltyDefensive = true,
    DirectOffensive = true,
    DirectDefensive = true,
    IndirectOffensive = true,
    IndirectDefensive = true,
}

local function isInField()
    local ballPos = World.Ball.pos
    return ballPos.x <= rightLine
        and ballPos.x >= leftLine
        and ballPos.y >= friendlyGoalLine
        and ballPos.y <= opponentGoalLine
end

local wasInFieldBefore = false
function OutOfField.occuring()
    if not possibleRefStates[World.RefereeState] then return false end
    if wasInFieldBefore and not isInField() then
        wasInFieldBefore = false
        return true
    elseif isInField() then
        wasInFieldBefore = true
    end
    return false
end

function OutOfField.print()
    local faulingTeam = "<font color=\"#C9C60D\">Yellow</font>"
    if (World.TeamIsBlue and Referee.friendlyTouchedLast()) or
            not World.TeamIsBlue and not Referee.friendlyTouchedLast() then
        faulingTeam = "<font color=\"blue\">Blue</font>"
    end
    log("Ball out field. Last touch: " .. faulingTeam)
end

return OutOfField
