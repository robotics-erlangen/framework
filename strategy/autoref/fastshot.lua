local FastShot = {}

local World = require "../base/world"
local Referee = require "../base/referee"

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

function FastShot.occuring()
    if not possibleRefStates[World.RefereeState] then return false end
    return World.Ball.speed:length() > 8
end

function FastShot.print()
    local offending = (World.TeamIsBlue and Referee.friendlyTouchedLast()) and
        "<font color=\"blue\">blue</font>" or "<font color=\"#C9C60D\">yellow</font>"
    log("Shot over 8m/s by " .. offending .. " team")
    log("Speed: " .. World.Ball.speed:length() .. "m/s")
end

return FastShot
